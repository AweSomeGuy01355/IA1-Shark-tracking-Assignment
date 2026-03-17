// quick helper to load CSV into MySQL table defined in init.sql
// usage: node load_sharks.js <path-to-csv>

const fs = require('fs');
const Papa = require('papaparse');
const mysql = require('mysql2');

if (process.argv.length < 3) {
    console.error('Usage: node load_sharks.js <csv-file>');
    process.exit(1);
}
const file = process.argv[2];
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'studentdb'
});

let rowsShown = 0;

db.connect(err => {
    if (err) {
        console.error('db connect error', err);
        process.exit(1);
    }
    console.log('connected');
    ensureTable(run);
});

function ensureTable(cb) {
    const create = `CREATE TABLE IF NOT EXISTS shark_catches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        species_name VARCHAR(255),
        species_code VARCHAR(64),
        capture_date DATE,
        area VARCHAR(255),
        location VARCHAR(255),
        latitude DECIMAL(10,6),
        longitude DECIMAL(10,6),
        fate VARCHAR(64),
        length_m DECIMAL(5,2),
        water_temp_c DECIMAL(4,1),
        number_caught INT,
        raw_json JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    db.query(create, (err) => {
        if (err) {
            console.error('failed to ensure table', err);
            process.exit(1);
        }
        cb();
    });
}

function run() {
    const stream = fs.createReadStream(file);
    Papa.parse(stream, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        // ignore lines until header row is seen
        beforeFirstChunk: function(chunk) {
            // chop off everything before "Species Name" header
            const idx = chunk.indexOf('Species Name');
            if (idx !== -1) {
                return chunk.slice(idx);
            }
            return chunk;
        },
        complete: results => {
            let rows = results.data.map(r => {
                const mapped = {
                    species_name: r['Species Name'] || r.Species || null,
                    species_code: r['Species Code'] || null,
                    capture_date: parseDate(r['Date'] || r.date),
                    area: r['Area'] || null,
                    location: r['Location'] || null,
                    latitude: parseFloat(r['Latitude'] || r.lat) || null,
                    longitude: parseFloat(r['Longitude'] || r.lng) || null,
                    fate: r['Fate'] || null,
                    length_m: parseFloat(r['Length (m)'] || r.Length) || null,
                    water_temp_c: parseFloat(r['Water Temp (C)'] || r.water_temp) || null,
                    number_caught: parseInt(r['Number Caught']||r.number||1,10) || 1,
                    raw_json: JSON.stringify(r)
                };
                // debug: show first few parsed rows
                if (rowsShown < 5) {
                    console.log('parsed row', mapped);
                    rowsShown++;
                }
                return mapped;
            });
            // drop records that have no useful data (blank lines, metadata leftovers)
            const before = rows.length;
            rows = rows.filter(r => r.species_name || r.latitude || r.longitude || r.capture_date);
            console.log(`filtered out ${before - rows.length} empty rows`);
            insertRows(rows);
        }
    });
}

function parseDate(s) {
    if (!s) return null;
    // try dd/mm/yyyy
    const parts = s.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
    return s;
}

function insertRows(rows) {
    if (!rows.length) {
        console.log('no rows to insert');
        process.exit(0);
    }
    const sql = `INSERT INTO shark_catches (species_name,species_code,capture_date,area,location,latitude,longitude,fate,length_m,water_temp_c,number_caught,raw_json) VALUES ?`;
    const values = rows.map(r => [r.species_name,r.species_code,r.capture_date,r.area,r.location,r.latitude,r.longitude,r.fate,r.length_m,r.water_temp_c,r.number_caught,r.raw_json]);
    // debug: show first few values arrays
    if (values.length > 0) {
        console.log('first values row', values[0]);
        console.log('second values row', values[1]);
    }
    db.query(sql, [values], (err, result) => {
        if (err) {
            console.error('insert error', err);
        } else {
            console.log(`inserted ${result.affectedRows} rows`);
        }
        db.end();
    });
}
