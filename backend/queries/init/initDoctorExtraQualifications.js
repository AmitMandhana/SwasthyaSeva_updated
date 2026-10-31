/**
 * DDL for doctor_extra_qualifications table (depends on Doctors and Extra Qualifications).
 * Run when related queries encounter a missing table.
 */
const initDoctorExtraQualificationsSQL = `
CREATE TABLE IF NOT EXISTS doctor_extra_qualifications (
    doctor_id INT NOT NULL,
    qualification_code TEXT NOT NULL,
    institution VARCHAR(200),
    year_completed INT,
    PRIMARY KEY (doctor_id, qualification_code),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (qualification_code) REFERENCES extra_qualifications(qualification_code)
);
`;

module.exports = initDoctorExtraQualificationsSQL;
