/**
 * DDL for Slots table.
 * Run when slot-related queries encounter a missing table.
 * Location is inherited from clinics (joined at query time).
 */
const initSlotsSQL = `
CREATE TABLE IF NOT EXISTS Slots (
    slot_id SERIAL PRIMARY KEY,
    clinic_id INT NOT NULL,
    doctor_id INT NOT NULL,
    slot_fee INT NOT NULL,
    slot_day TEXT CHECK (slot_day IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')) NOT NULL,
    slot_start INT NOT NULL CHECK (slot_start BETWEEN 0 AND 46),
    slot_end INT NOT NULL CHECK (slot_end BETWEEN slot_start + 1 AND 47),
    booking_fee INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (clinic_id) REFERENCES Clinics(clinic_id) ON DELETE CASCADE
);
`;

module.exports = initSlotsSQL;
