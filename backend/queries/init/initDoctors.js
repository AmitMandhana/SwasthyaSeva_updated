/**
 * DDL for Tags + Specializations + Doctors tables (in dependency order).
 * Run when doctor-related queries encounter a missing table.
 */
const initDoctorsSQL = `
CREATE TABLE IF NOT EXISTS Tags (
    tag_code TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Specializations (
    specialization_code TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Extra_Qualifications (
    qualification_code TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type TEXT CHECK (type IN ('fellowship', 'diploma', 'pdcc')) NOT NULL
);

CREATE TABLE IF NOT EXISTS Doctors (
    doctor_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(40) NOT NULL,
    last_name VARCHAR(40) NOT NULL,
    phone TEXT NOT NULL,
    pfp_link VARCHAR(100),
    base_degree_code TEXT NOT NULL,
    postgrad_specialization_code TEXT,
    super_specialization_code TEXT,
    tag_1 TEXT,
    tag_2 TEXT,
    tag_3 TEXT,
    bio TEXT,
    license_no VARCHAR(50) NOT NULL,
    verified_doctor BOOLEAN DEFAULT FALSE,
    banner_link VARCHAR(100),
    signature_link VARCHAR(100),
    prescription_format TEXT DEFAULT 'GEN_MED',
    password_hash VARCHAR(255) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (base_degree_code) REFERENCES Specializations(specialization_code),
    FOREIGN KEY (postgrad_specialization_code) REFERENCES Specializations(specialization_code),
    FOREIGN KEY (super_specialization_code) REFERENCES Specializations(specialization_code),
    FOREIGN KEY (tag_1) REFERENCES Tags(tag_code),
    FOREIGN KEY (tag_2) REFERENCES Tags(tag_code),
    FOREIGN KEY (tag_3) REFERENCES Tags(tag_code)
);

CREATE INDEX IF NOT EXISTS idx_doctors_base_degree ON Doctors(base_degree_code);
CREATE INDEX IF NOT EXISTS idx_doctors_postgrad ON Doctors(postgrad_specialization_code);
CREATE INDEX IF NOT EXISTS idx_doctors_super_spec ON Doctors(super_specialization_code);

CREATE TABLE IF NOT EXISTS Doctor_Extra_Qualifications (
    doctor_id INT NOT NULL,
    qualification_code TEXT NOT NULL,
    institution VARCHAR(200),
    year_completed INT,
    PRIMARY KEY (doctor_id, qualification_code),
    FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (qualification_code) REFERENCES Extra_Qualifications(qualification_code)
);

CREATE INDEX IF NOT EXISTS idx_doctor_extra_qual ON Doctor_Extra_Qualifications(qualification_code);
`;

module.exports = initDoctorsSQL;
