/**
 * DDL for the Admins table.
 * Run when admin-related queries encounter a missing table.
 */
const initAdminsSQL = `
CREATE TABLE IF NOT EXISTS Admins (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

module.exports = initAdminsSQL;
