CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- table for shark catch records imported from CSV
eCREATE TABLE IF NOT EXISTS shark_catches (
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
);