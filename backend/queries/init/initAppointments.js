const initAppointmentsSQL = `
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    doctor_id INT,
    slot_id INT NOT NULL,
    recommended_index INT NOT NULL,
    appointment_index INT,
    symptom_code VARCHAR(25) NOT NULL,
    symptom_text VARCHAR(200) NOT NULL,
    last_visit_id INT,
    visit_no INT NOT NULL,
    recommended_time TIME,
    complaints TEXT,
    booking_fee_paid INT DEFAULT 0,
    visit_fee_cleared INT DEFAULT 0,
    appointment_status TEXT CHECK (appointment_status IN ('pending', 'in_progress', 'completed', 'missed', 'cancelled', 'accepted', 'waiting', 'resolved')) DEFAULT 'pending',
    start_time TIME,
    end_time TIME,
    appointment_date DATE NOT NULL,
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    FOREIGN KEY (slot_id) REFERENCES slots(slot_id) ON DELETE CASCADE,
    FOREIGN KEY (last_visit_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    UNIQUE (recommended_index, slot_id, appointment_date),
    UNIQUE (appointment_index, slot_id, appointment_date)
);
`;

module.exports = initAppointmentsSQL;
