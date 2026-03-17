// map.js

console.log('map.js executing');
alert('map.js loaded');

    let map;
    let markersLayer;
    let heatLayer;
    let allRecords = [];
    let userSightings = []; // custom points added by user
    let sightingLayer;
    let addingSighting = false;

// configure default icon to use local vendor files
L.Icon.Default.mergeOptions({
    iconUrl: '/vendor/marker-icon.png',
    shadowUrl: '/vendor/marker-shadow.png'
});

function initMap() {
    map = L.map('map').setView([-25, 133], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    sightingLayer = L.layerGroup().addTo(map);
    heatLayer = null;

    map.on('click', event => {
        if (addingSighting) {
            addSighting(event.latlng.lat, event.latlng.lng);
        }
    });
}

async function loadData() {
    // try server API first, fall back to CSV
    try {
        const resp = await fetch('/api/sharks');
        if (resp.ok) {
            const rows = await resp.json();
            allRecords = rows.map(r => ({
                ...r,
                date: r.capture_date ? new Date(r.capture_date) : null,
                lat: r.latitude,
                lng: r.longitude
            })).filter(r => r.lat && r.lng && r.date);
            updateMap();
            return;
        }
    } catch(e) {
        // ignore and fall back
        console.warn('API fetch failed, using CSV:', e);
    }

    // fetch raw CSV text so we can strip metadata before parsing
    try {
        const resp = await fetch('/data/qld-shark-control-program-catch-by-species-2017.csv');
        const text = await resp.text();
        const lines = text.split(/\r?\n/);
        // find header row starting with "Species Name" (trim to be safe)
        let headerIndex = lines.findIndex(l => l.trim().startsWith('Species Name'));
        if (headerIndex === -1) headerIndex = 0;
        const clean = lines.slice(headerIndex).join('\n');
        Papa.parse(clean, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                allRecords = results.data.map(normalizeRecord);
                console.log('normalized sample', allRecords.slice(0,5));
                allRecords = allRecords.filter(r => r.lat && r.lng && r.date);
                console.log('records after filtering', allRecords.length);
                updateMap();
            },
            error: function(err) {
                console.error('Failed to parse CSV:', err);
                alert('Unable to load shark catch dataset; corrupted file?');
            }
        });
    } catch(err) {
        console.error('Failed to load CSV:', err);
        alert('Unable to load shark catch dataset. Please make sure the CSV file is placed in /public/data and is named qld-shark-control-program-catch-by-species-2017.csv.');
    }
}

function parseDateString(dateStr) {
    if (!dateStr) return null;
    // try ISO first
    let d = new Date(dateStr);
    if (!isNaN(d)) return d;
    // support dd/mm/yyyy or d/m/yyyy
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const [dPart, mPart, yPart] = parts;
        return new Date(`${yPart}-${mPart.padStart(2,'0')}-${dPart.padStart(2,'0')}`);
    }
    return null;
}

function normalizeRecord(r) {
    // try to adapt to common column names
    const dateStr = r.Date || r.date || r['Date of capture'] || r['date'];
    const lat = parseFloat(r.Latitude || r.lat || r.Lat || r.LatitudeDecimal);
    const lng = parseFloat(r.Longitude || r.lng || r.Long || r.LongitudeDecimal);
    const parsedDate = parseDateString(dateStr);
    // discard out-of-range coords
    const validLat = (!isNaN(lat) && lat >= -90 && lat <= 90) ? lat : null;
    const validLng = (!isNaN(lng) && lng >= -180 && lng <= 180) ? lng : null;
    return {
        ...r,
        date: parsedDate,
        lat: validLat,
        lng: validLng
    };
}

function filterRecords() {
    const filter = document.getElementById('timeFilter').value;
    let cutoff = null;
    const now = new Date();
    switch(filter) {
        case '24h': cutoff = new Date(now - 1000*60*60*24); break;
        case '1w': cutoff = new Date(now - 1000*60*60*24*7); break;
        case '1m': cutoff = new Date(now - 1000*60*60*24*30); break;
        case '3m': cutoff = new Date(now - 1000*60*60*24*90); break;
        case '6m': cutoff = new Date(now - 1000*60*60*24*182); break;
        case '1y': cutoff = new Date(now - 1000*60*60*24*365); break;
        case 'all': cutoff = null; break;
    }
    if (!cutoff) return allRecords;
    return allRecords.filter(r => r.date && r.date >= cutoff);
}

function groupByLocation(records) {
    const groups = {}; // key -> array
    records.forEach(r => {
        // use full precision string so closely spaced points stay separate
        const key = r.lat + ',' + r.lng;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    });
    return groups;
}

function updateMap() {
    const records = filterRecords();
    console.log('updateMap sees', records.length, 'records');
    const groups = groupByLocation(records);

    // clear existing layers
    markersLayer.clearLayers();
    sightingLayer.clearLayers();
    if (heatLayer) {
        map.removeLayer(heatLayer);
        heatLayer = null;
    }

    const points = [];
    let maxCount = 0;
    Object.values(groups).forEach(arr => {
        if (arr.length > maxCount) maxCount = arr.length;
        const {lat,lng} = arr[0];
        points.push([lat, lng, arr.length]);
    });

    if (document.getElementById('heatToggle').checked) {
        heatLayer = L.heatLayer(points.map(p => [p[0],p[1],p[2]]), {
            radius: 25,
            blur: 15,
            gradient: {0.1:'blue',0.3:'cyan',0.6:'yellow',0.9:'red'}
        }).addTo(map);
    } else {
        Object.values(groups).forEach(arr => {
            const {lat,lng} = arr[0];
            const count = arr.length;
            const radius = 5 + (25 * (count / maxCount));
            const circle = L.circleMarker([lat, lng], {radius, color:'#003366', fillColor:'#3366cc', fillOpacity:0.7, weight:1, opacity:1});
            circle.on('click', () => showPopup(arr, circle));
            circle.addTo(markersLayer);
        });
    }

    // draw user sightings
    userSightings.forEach(s => {
        const marker = L.marker([s.lat, s.lng], {icon: L.icon({
            iconUrl: '/vendor/marker-icon.png',
            iconSize: [25,41],
            iconAnchor: [12,41],
            popupAnchor: [1,-34],
            shadowUrl: '/vendor/marker-shadow.png',
            className: 'sighting-marker'
        })}).bindPopup(`<strong>Sighting</strong><br/>${s.desc || ''}<br/><em>${new Date(s.date).toLocaleString()}</em>`);
        marker.addTo(sightingLayer);
    });

    updateLegend(maxCount);

    // adjust map to show all created sharks if markers exist
    const bounds = markersLayer.getBounds();
    if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.1));
    }


// global error handler to catch any runtime problems
window.addEventListener('error', e => {
    console.error('map.js error', e.error || e.message);
    alert('map.js error: '+(e.error?.message||e.message));
});

function showPopup(records, layer) {
    if (records.length === 1) {
        const html = formatRecord(records[0]);
        layer.bindPopup(html).openPopup();
    } else {
        const list = records.map((r,i) => `<li><a href="#" data-idx="${i}">${r.Species||'shark'} @ ${r.date ? r.date.toLocaleString() : ''}</a></li>`).join('');
        const html = `<ul>${list}</ul>`;
        layer.bindPopup(html).openPopup();
        setTimeout(() => {
            document.querySelectorAll('a[data-idx]').forEach(a => {
                a.addEventListener('click', e => {
                    e.preventDefault();
                    const idx = +e.target.dataset.idx;
                    showInfoCard(records[idx]);
                    layer.closePopup();
                });
            });
        }, 10);
    }
}

function showInfoCard(record) {
    const container = document.getElementById('info-content');
    container.innerHTML = formatRecord(record);
    document.getElementById('info-card').style.display = 'block';
}

function formatRecord(r) {
    let html = '<div>';
    Object.entries(r).forEach(([k,v]) => {
        html += `<strong>${k}:</strong> ${v}<br/>`;
    });
    html += '</div>';
    return html;
}

function updateLegend(maxCount) {
    const minLabel = document.getElementById('legend-min');
    const maxLabel = document.getElementById('legend-max');
    minLabel.textContent = '1';
    maxLabel.textContent = maxCount;
}

function saveSightings() {
    localStorage.setItem('userSightings', JSON.stringify(userSightings));
}

function loadSightings() {
    const raw = localStorage.getItem('userSightings');
    if (raw) {
        try {
            userSightings = JSON.parse(raw);
        } catch(e) { userSightings = []; }
    }
}

function addSighting(lat, lng) {
    const desc = prompt('Describe the sighting (optional)');
    const rec = {lat, lng, date: new Date().toISOString(), desc};
    userSightings.push(rec);
    saveSightings();
    updateMap();
    addingSighting = false;
    document.getElementById('addSightingBtn').textContent = 'Add sighting';
}

// event listeners
window.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadSightings();
    loadData();
    document.getElementById('timeFilter').addEventListener('change', updateMap);
    document.getElementById('heatToggle').addEventListener('change', updateMap);
    document.getElementById('addSightingBtn').addEventListener('click', () => {
        addingSighting = !addingSighting;
        document.getElementById('addSightingBtn').textContent = addingSighting ? 'Click map to place' : 'Add sighting';
    });
})}
