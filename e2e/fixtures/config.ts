export type Environment = 'local' | 'dev' | 'prod';

export const APP_URLS: Record<Environment, Record<string, string>> = {
  local: {
    web: 'http://localhost:3000',
    admin: 'http://localhost:3001',
    doctor: 'http://localhost:3002',
    clinic: 'http://localhost:3003',
    backend: 'http://localhost:5000',
  },
  dev: {
    web: process.env.DEV_WEB_URL || 'http://localhost:3000',
    admin: process.env.DEV_ADMIN_URL || 'http://localhost:3001',
    doctor: process.env.DEV_DOCTOR_URL || 'http://localhost:3002',
    clinic: process.env.DEV_CLINIC_URL || 'http://localhost:3003',
    backend: process.env.DEV_BACKEND_URL || 'http://localhost:5000',
  },
  prod: {
    web: 'https://swasthyaseva.online',
    admin: 'https://admin.swasthyaseva.online',
    doctor: 'https://doctor.swasthyaseva.online',
    clinic: 'https://clinic.swasthyaseva.online',
    backend: 'https://swasthyaseva.onrender.com',
  },
};
