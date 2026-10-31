/**
 * DDL for Clinic_Admins table (depends on Clinics).
 * Run when clinic-manager-related queries encounter a missing table.
 */
const initClinicManagersSQL = `
CREATE TABLE IF NOT EXISTS Clinic_Admins (
    clinic_admin_id SERIAL PRIMARY KEY,
    clinic_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    phone TEXT NOT NULL,
    pfp_link VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clinic_id) REFERENCES Clinics(clinic_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_clinic_admin_username
    ON Clinic_Admins(clinic_id, username) WHERE is_deleted = FALSE;
`;

module.exports = initClinicManagersSQL;
