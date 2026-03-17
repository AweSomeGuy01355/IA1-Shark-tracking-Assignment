const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MySQL connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'studentdb'
});

function connectWithRetry() {
  db.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      console.log('Retrying in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
      return;
    }
    console.log('Connected to MySQL database');
    // Start the server after successful connection
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  });
}

connectWithRetry();

// Routes
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// simple shark data API (populated by import script or manual insert)
app.get('/api/sharks', (req, res) => {
  // optional date filtering: ?from=YYYY-MM-DD&to=YYYY-MM-DD
  let sql = 'SELECT * FROM shark_catches';
  const params = [];
  if (req.query.from) {
    sql += ' WHERE capture_date >= ?';
    params.push(req.query.from);
  }
  if (req.query.to) {
    sql += params.length ? ' AND capture_date <= ?' : ' WHERE capture_date <= ?';
    params.push(req.query.to);
  }
  db.query(sql, params, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  db.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: result.insertId, name, email });
  });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'User deleted' });
  });
});

// Database manager routes
app.get('/api/tables', (req, res) => {
  db.query('SHOW TABLES', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const tables = results.map(row => Object.values(row)[0]);
    res.json(tables);
  });
});

app.post('/api/query', (req, res) => {
  const { query } = req.body;
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});