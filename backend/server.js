const express = require("express");
const cors = require("cors");
require("dotenv").config();
const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const path = require("path");
const checkEnvironment = require("./utils/checkEnvironment");
const supabase = require("./db");
const testDBConnection = require("./utils/testDBConnection");
const { ensurePrescriptionFormatColumns } = require("./utils/ensurePrescriptionFormat");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const clinicRoutes = require("./routes/clinicRoutes");
const publicRoutes = require("./routes/publicRoutes");
const patientRoutes = require("./routes/patientRoutes");
const { DEV_MODE } = require('./config/env');
const testRoutes = DEV_MODE ? require("./routes/testRoutes") : null;
const PORT = process.env.PORT || 5000;

checkEnvironment();

const app = express();
app.set('trust proxy', 1);

const defaultOrigins = [
  "https://swasthyaseva.online",
  "https://admin.swasthyaseva.online",
  "https://doctor.swasthyaseva.online",
  "https://clinic.swasthyaseva.online",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : defaultOrigins;

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
}));
app.use(express.json({ limit: '4kb' }));
app.use(express.urlencoded({ extended: true, limit: '4kb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  const ts = () => new Date().toISOString();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(`[${ts()}] [${level}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

app.get("/health", (req, res) => {
  // #swagger.tags = ['Health']
  // #swagger.summary = 'Health check'
  res.json({ status: "ok" });
});

// Swagger API docs
const swaggerFile = path.join(__dirname, "swagger.json");
if (fs.existsSync(swaggerFile)) {
  const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFile, "utf8"));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/clinic", clinicRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api", userRoutes);
if (testRoutes) app.use("/api/test", testRoutes);

//Optional Error Handling -> review remaining
app.use((err, req, res, next) => {
  // Handle payload too large errors
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      error: "Request too large", 
      message: `Request size exceeds the maximum limit of 1KB`,
      maxSize: "1KB"
    });
  }
  
  // Handle JSON parsing errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: "Invalid JSON", 
      message: "Request body contains invalid JSON"
    });
  }
  
  console.error("[Global Error]", err);
  res.status(500).json({ error: "Internal server error" });
});

(async () => {
  const dbConnected = await testDBConnection(supabase);
  if (!dbConnected) {
    console.error("Database connection failed. Please check your configuration.");
    process.exit(1);
  }
  await ensurePrescriptionFormatColumns();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();

