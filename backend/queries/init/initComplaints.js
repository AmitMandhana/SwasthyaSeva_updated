const initComplaintsSQL = `
CREATE TABLE IF NOT EXISTS complaints (
    complaint_code VARCHAR(25) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO complaints (complaint_code, name) VALUES
('GENERAL_CHECKUP', 'General Checkup'),
('FOLLOW_UP', 'Follow-up Visit'),
('VACCINATION', 'Vaccination'),
('LAB_REPORT', 'Lab Report Discussion'),
('MED_REFILL', 'Medication Refill'),
('SECOND_OPINION', 'Second Opinion'),
('POST_SURGERY', 'Post-surgery Follow-up'),
('INJURY_ACCIDENT', 'Injury/Accident'),
('PREGNANCY', 'Pregnancy Consultation'),
('CHILD_HEALTH', 'Child Health Checkup'),
('EYE_EXAM', 'Eye Examination'),
('DENTAL', 'Dental Issue'),
('SKIN_PROBLEM', 'Skin Problem'),
('MENTAL_HEALTH', 'Mental Health'),
('CHRONIC_MGMT', 'Chronic Disease Management'),
('OTHER', 'Other')
ON CONFLICT (complaint_code) DO NOTHING;
`;

module.exports = initComplaintsSQL;
