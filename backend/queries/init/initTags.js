const initTagsSQL = `
CREATE TABLE IF NOT EXISTS tags (
    tag_code TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO tags (tag_code, name) VALUES
('PED', 'Pediatrician'),
('PSY', 'Psychiatrist'),
('DERM', 'Dermatologist'),
('RAD', 'Radio diagnosis'),
('ANESTH', 'Anesthesiologist'),
('PATH', 'Pathologist'),
('MICRO', 'Microbiologist'),
('BIOCHEM', 'Biochemist'),
('GEN_SURG', 'General surgeon'),
('ORTHO', 'Orthopedic surgeons'),
('ENT', 'ENT surgeon/Otorhinolaryngologist'),
('OPHTH', 'Ophthalmologist'),
('OBGYN', 'Obstetrics and gynaecologist'),
('RADIO_THER', 'Radiotherapist'),
('EMERG', 'Emergency medicine')
ON CONFLICT (tag_code) DO NOTHING;
`;

module.exports = initTagsSQL;
