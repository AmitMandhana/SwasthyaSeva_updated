const initPatientInquiriesSQL = `
CREATE TABLE IF NOT EXISTS patient_inquiries (
    inquiry_id SERIAL PRIMARY KEY,
    clinic_id INT NOT NULL,
    patient_name VARCHAR(100) NOT NULL,
    patient_phone TEXT NOT NULL,
    symptom_text VARCHAR(500),
    source TEXT CHECK (source IN ('slot_search', 'clinic_page', 'phone', 'walkin', 'other')) DEFAULT 'other',
    status TEXT CHECK (status IN ('new', 'contacted', 'booked', 'lost')) DEFAULT 'new',
    notes TEXT,
    slot_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES slots(slot_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_patient_inquiries_clinic ON patient_inquiries(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patient_inquiries_status ON patient_inquiries(status);
`;

module.exports = initPatientInquiriesSQL;
