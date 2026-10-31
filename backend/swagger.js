const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'SwasthyaSeva API',
    description: 'Healthcare platform API for managing doctors, clinics, appointments, and prescriptions',
    version: '1.0.0',
  },
  host: 'localhost:5000',
  basePath: '/',
  schemes: ['http', 'https'],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'JWT token - prefix with "Bearer "',
    },
  },
  tags: [
    { name: 'Auth', description: 'Registration endpoints' },
    { name: 'Public', description: 'Public endpoints (no auth required)' },
    { name: 'Admin', description: 'Admin panel endpoints' },
    { name: 'Doctor', description: 'Doctor portal endpoints' },
    { name: 'Clinic', description: 'Clinic portal endpoints' },
    { name: 'Patient', description: 'Patient endpoints' },
    { name: 'User', description: 'User endpoints' },
  ],
};

const outputFile = './swagger.json';
const routes = ['./server.js'];

swaggerAutogen(outputFile, routes, doc);
