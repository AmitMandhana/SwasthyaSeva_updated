CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    dob TIMESTAMP NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female', 'others')) NOT NULL,
    pfp_link VARCHAR(100),
    verified_phone BOOLEAN DEFAULT FALSE,
    verified_email BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    street_address TEXT NOT NULL,
    city VARCHAR(40) NOT NULL,
    state VARCHAR(40) NOT NULL,
    country VARCHAR(40) NOT NULL DEFAULT 'India',
    location_x DOUBLE PRECISION NOT NULL,
    location_y DOUBLE PRECISION NOT NULL,
    phone_hash VARCHAR(64) NOT NULL,
    occupation TEXT NOT NULL DEFAULT '',
    attendant_name TEXT,
    attendant_relationship TEXT,
    name_hash VARCHAR(64) NOT NULL,
    CONSTRAINT unique_phone_name UNIQUE (phone_hash, name_hash)
);

CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE specializations (
    specialization_code TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE extra_qualifications (
    qualification_code TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type TEXT CHECK (type IN ('fellowship', 'diploma', 'pdcc')) NOT NULL
);

CREATE TABLE tags (
    tag_code TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE doctors (
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
    password_hash VARCHAR(255) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (base_degree_code) REFERENCES specializations(specialization_code),
    FOREIGN KEY (postgrad_specialization_code) REFERENCES specializations(specialization_code),
    FOREIGN KEY (super_specialization_code) REFERENCES specializations(specialization_code),
    FOREIGN KEY (tag_1) REFERENCES tags(tag_code),
    FOREIGN KEY (tag_2) REFERENCES tags(tag_code),
    FOREIGN KEY (tag_3) REFERENCES tags(tag_code)
);

CREATE INDEX idx_doctors_base_degree ON doctors(base_degree_code);
CREATE INDEX idx_doctors_postgrad ON doctors(postgrad_specialization_code);
CREATE INDEX idx_doctors_super_spec ON doctors(super_specialization_code);

CREATE TABLE doctor_extra_qualifications (
    doctor_id INT NOT NULL,
    qualification_code TEXT NOT NULL,
    institution VARCHAR(200),
    year_completed INT,
    PRIMARY KEY (doctor_id, qualification_code),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (qualification_code) REFERENCES extra_qualifications(qualification_code)
);

CREATE INDEX idx_doctor_extra_qual ON doctor_extra_qualifications(qualification_code);

CREATE TABLE clinics (
    clinic_id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    clinic_name VARCHAR(20),
    phone TEXT NOT NULL,
    license_no VARCHAR(50) NOT NULL,
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

CREATE TABLE clinic_admins (
    clinic_admin_id SERIAL PRIMARY KEY,
    clinic_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    phone TEXT NOT NULL,
    pfp_link VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id) ON DELETE CASCADE
);

-- Unique constraint on (clinic_id, username) for non-deleted clinic admins
CREATE UNIQUE INDEX unique_clinic_admin_username ON clinic_admins(clinic_id, username) WHERE is_deleted = FALSE;

CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    entity_username TEXT,
    endpoint TEXT NOT NULL,
    data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE TABLE active_tokens (
    token_id SERIAL PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    role TEXT NOT NULL,
    user_id INT NOT NULL,
    ip_address TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_active_tokens_role_user ON active_tokens(role, user_id);
CREATE INDEX idx_active_tokens_expires ON active_tokens(expires_at);

CREATE TABLE slots (
    slot_id SERIAL PRIMARY KEY,
    clinic_id INT NOT NULL,
    doctor_id INT NOT NULL,
    slot_fee INT NOT NULL,
    slot_day TEXT CHECK (slot_day IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')) NOT NULL,
    slot_start INT NOT NULL CHECK (slot_start BETWEEN 0 AND 46),
    slot_end INT NOT NULL CHECK (slot_end BETWEEN slot_start + 1 AND 47),
    booking_fee INT DEFAULT 0,
    watermark_url VARCHAR(200),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id) ON DELETE CASCADE
);

CREATE TABLE appointments (
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
    appointment_status TEXT CHECK (appointment_status IN ('pending', 'in_progress', 'completed', 'missed', 'cancelled', 'accepted', 'waiting')) DEFAULT 'pending',
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

CREATE TABLE symptoms (
    symptom_code VARCHAR(25) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO symptoms (symptom_code, name) VALUES
('FEVER', 'Fever'), ('CHILLS', 'Chills'), ('NIGHT_SWEATS', 'Night Sweats'),
('FATIGUE', 'Fatigue'), ('WEAKNESS', 'Weakness'), ('WEIGHT_LOSS', 'Weight Loss'),
('WEIGHT_GAIN', 'Weight Gain'), ('LOSS_OF_APPETITE', 'Loss of Appetite'),
('HEADACHE', 'Headache'), ('DIZZINESS', 'Dizziness'), ('LIGHTHEADEDNESS', 'Lightheadedness'),
('FAINTING', 'Fainting'), ('SEIZURES', 'Seizures'), ('CONFUSION', 'Confusion'),
('MEMORY_LOSS', 'Memory Loss'), ('DIFFICULTY_CONCENTRAT', 'Difficulty Concentrating'),
('ANXIETY', 'Anxiety'), ('DEPRESSED_MOOD', 'Depressed Mood'), ('MOOD_SWINGS', 'Mood Swings'),
('SLEEP_DISTURBANCE', 'Sleep Disturbance'), ('INSOMNIA', 'Insomnia'),
('EXCESSIVE_SLEEPINESS', 'Excessive Sleepiness'), ('SNORING', 'Snoring'),
('SHORTNESS_OF_BREATH', 'Shortness of Breath'), ('DIFFICULTY_BREATHING', 'Difficulty Breathing'),
('CHEST_PAIN', 'Chest Pain'), ('PALPITATIONS', 'Palpitations'), ('SWELLING_OF_LEGS', 'Swelling of Legs'),
('COUGH', 'Cough'), ('DRY_COUGH', 'Dry Cough'), ('PRODUCTIVE_COUGH', 'Productive Cough'),
('WHEEZING', 'Wheezing'), ('SORE_THROAT', 'Sore Throat'), ('RUNNY_NOSE', 'Runny Nose'),
('NASAL_CONGESTION', 'Nasal Congestion'), ('SNEEZING', 'Sneezing'), ('HOARSENESS', 'Hoarseness'),
('NAUSEA', 'Nausea'), ('VOMITING', 'Vomiting'), ('ABDOMINAL_PAIN', 'Abdominal Pain'),
('BLOATING', 'Bloating'), ('INDIGESTION', 'Indigestion'), ('HEARTBURN', 'Heartburn'),
('DIARRHEA', 'Diarrhea'), ('CONSTIPATION', 'Constipation'), ('BLOOD_IN_STOOL', 'Blood in Stool'),
('BLACK_TARRY_STOOL', 'Black Tarry Stool'), ('JAUNDICE', 'Jaundice'), ('DARK_URINE', 'Dark Urine'),
('BURNING_DURING_URINA', 'Burning Sensation During Urination'), ('FREQUENT_URINATION', 'Frequent Urination'),
('URGENCY_TO_URINATE', 'Urgency to Urinate'), ('BLOOD_IN_URINE', 'Blood in Urine'),
('DECREASED_URINE_OUT', 'Decreased Urine Output'), ('PELVIC_PAIN', 'Pelvic Pain'),
('TESTICULAR_PAIN', 'Testicular Pain'), ('ERECTILE_DYSFUNCTION', 'Erectile Dysfunction'),
('VAGINAL_DISCHARGE', 'Vaginal Discharge'), ('ABNORMAL_VAG_BLEED', 'Abnormal Vaginal Bleeding'),
('PAINFUL_MENSTRUATION', 'Painful Menstruation'), ('MISSED_PERIODS', 'Missed Periods'),
('JOINT_PAIN', 'Joint Pain'), ('JOINT_SWELLING', 'Joint Swelling'), ('MUSCLE_PAIN', 'Muscle Pain'),
('BACK_PAIN', 'Back Pain'), ('NECK_PAIN', 'Neck Pain'), ('STIFFNESS', 'Stiffness'),
('LIMITED_RANGE_MOTION', 'Limited Range of Motion'), ('NUMBNESS', 'Numbness'),
('TINGLING_SENSATION', 'Tingling Sensation'), ('BURNING_SENSATION', 'Burning Sensation'),
('TREMORS', 'Tremors'), ('RASH', 'Rash'), ('ITCHING', 'Itching'), ('HIVES', 'Hives'),
('DRY_SKIN', 'Dry Skin'), ('SKIN_DISCOLORATION', 'Skin Discoloration'), ('BRUISING', 'Bruising'),
('HAIR_LOSS', 'Hair Loss'), ('VISION_BLURRING', 'Vision Blurring'), ('DOUBLE_VISION', 'Double Vision'),
('EYE_PAIN', 'Eye Pain'), ('RED_EYES', 'Red Eyes'), ('HEARING_LOSS', 'Hearing Loss'),
('RINGING_IN_EARS', 'Ringing in Ears'), ('EAR_PAIN', 'Ear Pain'), ('NOSEBLEEDS', 'Nosebleeds'),
('BLEEDING_GUMS', 'Bleeding Gums'), ('OTHER', 'Other');

CREATE TABLE complaints (
    complaint_code VARCHAR(25) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO complaints (complaint_code, name) VALUES
('GENERAL_CHECKUP', 'General Checkup'), ('FOLLOW_UP', 'Follow-up Visit'),
('VACCINATION', 'Vaccination'), ('LAB_REPORT', 'Lab Report Discussion'),
('MED_REFILL', 'Medication Refill'), ('SECOND_OPINION', 'Second Opinion'),
('POST_SURGERY', 'Post-surgery Follow-up'), ('INJURY_ACCIDENT', 'Injury/Accident'),
('PREGNANCY', 'Pregnancy Consultation'), ('CHILD_HEALTH', 'Child Health Checkup'),
('EYE_EXAM', 'Eye Examination'), ('DENTAL', 'Dental Issue'),
('SKIN_PROBLEM', 'Skin Problem'), ('MENTAL_HEALTH', 'Mental Health'),
('CHRONIC_MGMT', 'Chronic Disease Management'), ('OTHER', 'Other');

CREATE TABLE clinic_audit_logs (
    log_id SERIAL PRIMARY KEY,
    clinic_id INT NOT NULL,
    actor_role TEXT NOT NULL,
    actor_id INT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    endpoint TEXT NOT NULL,
    data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_clinic_audit_clinic ON clinic_audit_logs(clinic_id);
CREATE INDEX idx_clinic_audit_created ON clinic_audit_logs(created_at DESC);

CREATE TABLE patient_inquiries (
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
CREATE INDEX idx_patient_inquiries_clinic ON patient_inquiries(clinic_id);
CREATE INDEX idx_patient_inquiries_status ON patient_inquiries(status);

CREATE TABLE notes (
    note_id SERIAL PRIMARY KEY,
    clinic_id INT NOT NULL,
    user_id INT NOT NULL,
    disease VARCHAR(200),
    call_date DATE,
    reminder_date DATE,
    fetching_date BOOLEAN DEFAULT FALSE
);

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    clinic_id INT NOT NULL,
    user_id INT NOT NULL,
    appointment_id INT,
    total_amount NUMERIC(10,2) NOT NULL,
    advanced_amount NUMERIC(10,2) DEFAULT 0.00 CHECK (advanced_amount >= 0),
    cleared_amount NUMERIC(10,2) DEFAULT 0.00 CHECK (cleared_amount >= 0),
    advance_mode TEXT CHECK (advance_mode IN ('cash', 'card', 'upi', 'netbanking', 'other')) NOT NULL,
    clear_mode TEXT CHECK (clear_mode IN ('cash', 'card', 'upi', 'netbanking', 'other')) NOT NULL,
    advance_trid VARCHAR(100),
    clear_trid VARCHAR(100),
    remarks TEXT,
    advance_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    clear_date TIMESTAMP,
    update_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id) ON DELETE CASCADE
);

CREATE TABLE medicines (
    medicine_id SERIAL PRIMARY KEY,
    medicine_name VARCHAR(50) NOT NULL,
    medicine_no VARCHAR(50) NOT NULL,
    precautions VARCHAR(200) DEFAULT ''
);

CREATE TABLE forbidden_comboes (
    combo_id SERIAL PRIMARY KEY,
    medicine_id_1 INT NOT NULL,
    medicine_id_2 INT NOT NULL,
    FOREIGN KEY (medicine_id_1) REFERENCES medicines(medicine_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id_2) REFERENCES medicines(medicine_id) ON DELETE CASCADE
);

CREATE TABLE medications (
    medication_id SERIAL PRIMARY KEY,
    medication_type TEXT CHECK (medication_type IN ('tablet','capsule','pill','powder','logens','aquaous_sol','suspension','drops','syrup','linctus','elixir','injection','paste','gel','ointment')) NOT NULL,
    medicine_name VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    appointment_id INT NOT NULL,
    medicine_id INT,
    amount INT NOT NULL,
    dosage INT NOT NULL,
    frequency INT NOT NULL,
    route TEXT CHECK (route IN ('skin', 'eye', 'ear', 'nail', 'topical_rectal', 'deeper_tissue', 'arterial_supply', 'oral', 'sublingual', 'rectal', 'cutaneous', 'inhalation', 'nasal', 'subcutaneous', 'intramuscular', 'intraveinous', 'intradermal')) NOT NULL,
    duration_days INT NOT NULL,
    special_instructions TEXT,
    timings TEXT,
    conditional_instructions TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE SET NULL
);

CREATE TABLE examination_records (
    examination_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    height INT,
    weight INT,
    sp_systolic INT,
    bp_diastolic INT,
    heart_rate INT,
    respiratory_rate INT,
    oxygen_saturation INT,
    blood_sugar INT,
    temperature DECIMAL,
    waist_circumference DECIMAL,
    FOREIGN KEY (examination_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE test_requests (
    request_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    appointment_id INT NOT NULL,
    test_name VARCHAR(50) NOT NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE test_reports (
    report_id INT PRIMARY KEY,
    clinic_id INT,
    test_report_link VARCHAR(100) NOT NULL,
    test_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id) ON DELETE SET NULL,
    FOREIGN KEY (report_id) REFERENCES test_requests(request_id) ON DELETE CASCADE
);

CREATE TABLE prescriptions (
    prescription_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    chief_complain TEXT NOT NULL,
    significant_medical_history TEXT,
    other_findings TEXT,
    provisional_diagnosis TEXT NOT NULL,
    final_diagnosis TEXT,
    prognosis TEXT,
    duration INT NOT NULL,
    refills INT NOT NULL,
    digital_signature VARCHAR(150),
    surgical_intervention_suggested TEXT,
    investigations_suggested TEXT,
    format_data JSONB DEFAULT '{}',
    prescription_format TEXT DEFAULT 'GEN_MED',
    FOREIGN KEY (prescription_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Initial tags Data
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
('EMERG', 'Emergency medicine');

-- Initial Specialization Data
-- Base Degrees
INSERT INTO specializations (specialization_code, name) VALUES
('MBBS', 'Bachelor of Medicine, Bachelor of Surgery'),
('BDS', 'Bachelor of Dental Surgery');

-- Postgraduate specializations
-- MD (Doctor of Medicine)
INSERT INTO specializations (specialization_code, name) VALUES
('MD_AERO_MED', 'MD (Aerospace Medicine)'),
('MD_ANAT', 'MD (Anatomy)'),
('MD_ANAES', 'MD (Anesthesiology)'),
('MD_BIOCHEM', 'MD (Biochemistry)'),
('MD_BIOPHYS', 'MD (Biophysics)'),
('MD_COMM_MED', 'MD (Community Medicine)'),
('MD_DERM', 'MD (Dermatology, Venerology and Leprosy)'),
('MD_EMERG', 'MD (Emergency Medicine)'),
('MD_FAM_MED', 'MD (Family Medicine)'),
('MD_FORENSIC', 'MD (Forensic Medicine and Toxicology)'),
('MD_GEN_MED', 'MD (General Medicine)'),
('MD_GERIATRICS', 'MD (Geriatrics)'),
('MD_HEALTH_ADMIN', 'MD (Health Administration)'),
('MD_HOSP_ADMIN', 'MD (Hospital Administration)'),
('MD_IMMUNO_BT', 'MD (Immunohematology and Blood Transfusion)'),
('MD_LAB_MED', 'MD (Laboratory Medicine)'),
('MD_MARINE', 'MD (Marine Medicine)'),
('MD_MPH_EPID', 'MD (Master of Public Health - Epidemiology)'),
('MD_MICRO', 'MD (Microbiology)'),
('MD_NUCLEAR', 'MD (Nuclear Medicine)'),
('MD_PEDI', 'MD (Paediatrics)'),
('MD_PALLIAT', 'MD (Palliative Medicine)'),
('MD_PATH', 'MD (Pathology)'),
('MD_PHARMA', 'MD (Pharmacology)'),
('MD_PHYS_REHAB', 'MD (Physical Medicine and Rehabilitation)'),
('MD_PHYSIO', 'MD (Physiology)'),
('MD_PSYCH', 'MD (Psychiatry)'),
('MD_RADIO_ONCO', 'MD (Radiation Oncology)'),
('MD_RADIO', 'MD (Radio-diagnosis)'),
('MD_RESP_MED', 'MD (Respiratory Medicine)'),
('MD_SPORTS', 'MD (Sports Medicine)'),
('MD_TROPICAL', 'MD (Tropical Medicine)');

-- MS (Master of Surgery)
INSERT INTO specializations (specialization_code, name) VALUES
('MS_GEN_SURG', 'MS (General Surgery)'),
('MS_OBGYN', 'MS (Obstetrics & Gynecology)'),
('MS_OPHTH', 'MS (Ophthalmology)'),
('MS_ORTHO', 'MS (Orthopedics)'),
('MS_ORL_HN', 'MS (Otorhinolaryngology - Head and Neck)'),
('MS_TRAUMA', 'MS (Traumatology and Surgery)');

-- Softboard (kanban)
CREATE TABLE softboard_columns (
    column_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE softboard_cards (
    card_id SERIAL PRIMARY KEY,
    column_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    link_text VARCHAR(200),
    link_url VARCHAR(500),
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES softboard_columns(column_id) ON DELETE CASCADE
);

CREATE INDEX idx_softboard_cards_column ON softboard_cards(column_id);
CREATE INDEX idx_softboard_columns_position ON softboard_columns(position);
CREATE INDEX idx_softboard_cards_position ON softboard_cards(column_id, position);

-- Super specializations
-- DM (Doctorate of Medicine)
INSERT INTO specializations (specialization_code, name) VALUES
('DM_CARDIAC_ANAES', 'DM (Cardiac Anaesthesia)'),
('DM_CARDIO', 'DM (Cardiology)'),
('DM_CHILD_ADOL_PSY', 'DM (Child and Adolescent Psychiatry)'),
('DM_CLIN_HAEM', 'DM (Clinical Haematology)'),
('DM_CLIN_IMMUNO_RHEUM', 'DM (Clinical Immunology and Rheumatology)'),
('DM_CRIT_CARE', 'DM (Critical Care Medicine)'),
('DM_ENDO', 'DM (Endocrinology)'),
('DM_GERIATRIC_MH', 'DM (Geriatric Mental Health)'),
('DM_HEPATO', 'DM (Hepatology)'),
('DM_INFECT_DIS', 'DM (Infectious Disease)'),
('DM_INTERVENT_RADIO', 'DM (Interventional Radiology)'),
('DM_MED_GASTRO', 'DM (Medical Gastroenterology)'),
('DM_MED_GEN', 'DM (Medical Genetics)'),
('DM_ONCO', 'DM (Medical Oncology)'),
('DM_NEONAT', 'DM (Neonatology)'),
('DM_NEPHRO', 'DM (Nephrology)'),
('DM_NEURO_ANAES', 'DM (Neuro Anaesthesia)'),
('DM_NEURO', 'DM (Neurology)'),
('DM_NEURO_RADIO', 'DM (Neuro-radiology)'),
('DM_ONCO_PATH', 'DM (Onco-Pathology)'),
('DM_ORGAN_TX_ANAES', 'DM (Organ Transplant Anaesthesia and Critical Care)'),
('DM_PAED_NEONAT_ANAES', 'DM (Paediatric and Neonatal Anaesthesia)'),
('DM_PAED_CARDIO', 'DM (Paediatric Cardiology)'),
('DM_PAED_CRIT_CARE', 'DM (Paediatric Critical Care)'),
('DM_PAED_GASTRO', 'DM (Paediatric Gastroenterology)'),
('DM_PAED_HEPATO', 'DM (Paediatric Hepatology)'),
('DM_PAED_NEPHRO', 'DM (Paediatric Nephrology)'),
('DM_PAED_NEURO', 'DM (Paediatric Neurology)'),
('DM_PAED_ONCO', 'DM (Paediatric Oncology)'),
('DM_PULM', 'DM (Pulmonary Medicine)'),
('DM_VIROL', 'DM (Virology)');

-- MCh (Magister of Chirurgiae)
INSERT INTO specializations (specialization_code, name) VALUES
('MCH_CARDIAC_SURG', 'MCh (Cardiac Surgery)'),
('MCH_ENDO_SURG', 'MCh (Endocrine Surgery)'),
('MCH_GYNAE_ONCO', 'MCh (Gynaecological Oncology)'),
('MCH_HAND', 'MCh (Hand Surgery)'),
('MCH_HEAD_NECK', 'MCh (Head and Neck Surgery)'),
('MCH_HPB', 'MCh (Hepato-Pancreato-Billiary-Surgery)'),
('MCH_NEURO', 'MCh (Neurosurgery)'),
('MCH_PAED_CTVS', 'MCh (Paediatric Cardio Thoracic and Vascular Surgery)'),
('MCH_PAED_ORTHO', 'MCh (Paediatric Orthopaedics)'),
('MCH_PAED_SURG', 'MCh (Paediatric Surgery)'),
('MCH_PLAST', 'MCh (Plastic & Reconstructive Surgery)'),
('MCH_REPRO', 'MCh (Reproductive Medicine and Surgery)'),
('MCH_SURG_GASTRO', 'MCh (Surgical Gastroenterology)'),
('MCH_SURG_ONCO', 'MCh (Surgical Oncology)'),
('MCH_THORACIC', 'MCh (Thoracic Surgery)'),
('MCH_UROL', 'MCh (Urology)'),
('MCH_VASC', 'MCh (Vascular Surgery)'),
('MCH_CVTS', 'MCh (Cardio Vascular & Thoracic Surgery)');

-- Extra Qualifications Data
-- Fellowships
INSERT INTO extra_qualifications (qualification_code, name, type) VALUES
('FELLOW_INTERVENT_CARDIO', 'Fellowship in Interventional Cardiology', 'fellowship'),
('FELLOW_ELECTROPHYSIO', 'Fellowship in Cardiac Electrophysiology', 'fellowship'),
('FELLOW_NEURO_INTERVENT', 'Fellowship in Neuro-Interventional Surgery', 'fellowship'),
('FELLOW_SPINE', 'Fellowship in Spine Surgery', 'fellowship'),
('FELLOW_HAND_SURG', 'Fellowship in Hand Surgery', 'fellowship'),
('FELLOW_SPORTS_MED', 'Fellowship in Sports Medicine', 'fellowship'),
('FELLOW_PEDIATRIC_CARDIO', 'Fellowship in Pediatric Cardiology', 'fellowship'),
('FELLOW_CRITICAL_CARE', 'Fellowship in Critical Care Medicine', 'fellowship'),
('FELLOW_PAIN_MED', 'Fellowship in Pain Medicine', 'fellowship'),
('FELLOW_BARIATRIC', 'Fellowship in Bariatric Surgery', 'fellowship');

-- Post-Graduate Diplomas
INSERT INTO extra_qualifications (qualification_code, name, type) VALUES
('PGDPLM_ALLERGY', 'Allergy and Clinical Immunology', 'diploma'),
('PGDPLM_ANAES', 'Anaesthesiology (D.A.)', 'diploma'),
('PGDPLM_CLIN_PATH', 'Clinical Pathology (D.C.P.)', 'diploma'),
('PGDPLM_COMM_MED', 'Community Medicine / Public Health (D.C.M./D.P.H.)', 'diploma'),
('PGDPLM_DERM', 'Dermatology, Venereology and Leprosy (D.D.V.L.)', 'diploma'),
('PGDPLM_FORENSIC', 'Forensic Medicine (D.F.M.)', 'diploma'),
('PGDPLM_HEALTH_EDU', 'Health Education (D.H.E.)', 'diploma'),
('PGDPLM_HEALTH_ADMIN', 'Health Administration (D.H.A.)', 'diploma'),
('PGDPLM_IMMUNO_BT', 'Immuno-Haematology and Blood Transfusion (D.I.H.B.T.)', 'diploma'),
('PGDPLM_MARINE', 'Marine Medicine (Dip. M.M.)', 'diploma'),
('PGDPLM_MICRO', 'Microbiology (D. Micro)', 'diploma'),
('PGDPLM_NUTR', 'Nutrition (D.N.)', 'diploma'),
('PGDPLM_OBGYN', 'Obstetrics and Gynecology (D.G.O.)', 'diploma'),
('PGDPLM_OCC_HEALTH', 'Occupational Health (D.O.H.)', 'diploma'),
('PGDPLM_OPHTH', 'Ophthalmology (D.O.)', 'diploma'),
('PGDPLM_ORTHO', 'Orthopaedics (D. Ortho.)', 'diploma'),
('PGDPLM_ORL', 'Otorhinolaryngology (D.L.O.)', 'diploma'),
('PGDPLM_PEDI', 'Pediatrics (D.C.H.)', 'diploma'),
('PGDPLM_PHYS_REHAB', 'Physical Medicine and Rehabilitation (D. Phy. Med. and R.)', 'diploma'),
('PGDPLM_PSYCH', 'Psychiatry (D.P.M.)', 'diploma'),
('PGDPLM_RAD_MED', 'Radiation Medicine (D.R.M.)', 'diploma'),
('PGDPLM_RADIO_DIAG', 'Radiodiagnosis (D.M.R.D.)', 'diploma'),
('PGDPLM_RADIOTHER', 'Radio-therapy (D.M.R.T.)', 'diploma'),
('PGDPLM_RAD_PHYS', 'Radiological Physics (D.R.P.)', 'diploma'),
('PGDPLM_SPORTS', 'Sport Medicine (D.S.M.)', 'diploma'),
('PGDPLM_TROP_MED', 'Tropical Medicine and Health (D.T.M. and H.)', 'diploma'),
('PGDPLM_TB_CHEST', 'Tuberculosis and Chest Diseases (D.T.C.D.)', 'diploma'),
('PGDPLM_VIROL', 'Virology (D. Vir.)', 'diploma');

-- Post-Doctoral Certificate Courses (PDCC)
INSERT INTO extra_qualifications (qualification_code, name, type) VALUES
('PDCC_ORGAN_TX_ANAES', 'PDCC in Organ Transplant Anaesthesia', 'pdcc'),
('PDCC_PAED_ENDO', 'PDCC in Pediatric Endocrinology', 'pdcc'),
('PDCC_LAB_IMMUNO', 'PDCC in Laboratory Immunology', 'pdcc'),
('PDCC_NUCLEAR_NEPHRO', 'PDCC in Nuclear Nephrology', 'pdcc'),
('PDCC_RENAL_PATH', 'PDCC in Renal Pathology', 'pdcc'),
('PDCC_GASTRO_RADIO', 'PDCC in Gastro-Radiology', 'pdcc'),
('PDCC_APHAERESIS', 'PDCC in Aphaeresis Technology and Blood Component Therapy', 'pdcc'),
('PDCC_PAIN_MGMT', 'PDCC in Pain Management', 'pdcc'),
('PDCC_HAEM_ONCO', 'PDCC in Haemato-Oncology', 'pdcc'),
('PDCC_PAED_ENT', 'PDCC in Pediatric ENT', 'pdcc'),
('PDCC_SPINE', 'PDCC in Spine Surgery', 'pdcc');