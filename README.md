# Student Database App

This is a Docker-based development environment for students to learn HTML, CSS, JavaScript, and database interactions using Node.js and MySQL.

## Setup

1. Ensure you have Docker and Docker Compose installed.
2. Clone this repository.
3. Run `docker-compose up --build` to start the application.

The app will be available at http://localhost:3000.

## Project Structure

- `server.js`: Node.js Express server
- `public/`: Frontend files (HTML, CSS, JS)
- `public/data/`: dataset files (e.g. shark catch CSV)
- `init.sql`: Database initialization script
- `Dockerfile`: Docker image for the Node.js app
- `docker-compose.yml`: Multi-service setup with app and MySQL

## API Endpoints

## Shark Catch Map

A static visualization page has been added to show Queensland shark control program catches on an interactive map. Place the CSV dataset (`qld-shark-control-program-catch-by-species-2017.csv`) under `public/data/` and open `/map.html` in the browser. The map supports time‑based filters, heatmap overlay, and click‑through details.

Users can now add their own "sighting" points by clicking **Add sighting** and then clicking a location on the map. Sightings are stored locally (via `localStorage`) and rendered with a distinct blue‑tinted marker separate from the shark catch data. Clicking a sighting shows its description and timestamp.

### Server‑side import (optional)
If you prefer having the shark dataset in MySQL rather than loading CSV client‑side, a new table `shark_catches` is created by `init.sql` and you can populate it with:

```bash
# after starting the DB container or server
node load_sharks.js public/data/qld-shark-control-program-catch-by-species-2017.csv
```

This script parses the CSV and inserts rows; it handles common column names and stores the raw JSON row for reference.

An API endpoint is available at `/api/sharks` which returns all rows and accepts optional query parameters `from`/`to` (YYYY‑MM‑DD) for filtering.

The frontend map remains unchanged but could be modified to fetch from this endpoint instead of the CSV if desired.

## API Endpoints

- `GET /api/users`: Get all users
- `POST /api/users`: Add a new user (body: {name, email})
- `DELETE /api/users/:id`: Delete a user by ID

## Database Manager

Access the simple database manager at http://localhost:3000/db-manager.html to view tables and run SQL queries.