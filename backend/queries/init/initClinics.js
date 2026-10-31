/**
 * DDL for Clinics table (depends on Doctors).
 * Run when clinic-related queries encounter a missing table.
 */
const initClinicsSQL = `
CREATE TABLE IF NOT EXISTS Clinics (
    clinic_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    clinic_name VARCHAR(20),
    license_no VARCHAR(50) NOT NULL,
    phone TEXT NOT NULL,
    pfp_link VARCHAR(100) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    banner_link VARCHAR(100) NOT NULL,
    street_address VARCHAR(40) NOT NULL,
    city VARCHAR(40) NOT NULL,
    state VARCHAR(40) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    country VARCHAR(40) NOT NULL DEFAULT 'India',
    location_x DOUBLE PRECISION NOT NULL,
    location_y DOUBLE PRECISION NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

module.exports = initClinicsSQL;
