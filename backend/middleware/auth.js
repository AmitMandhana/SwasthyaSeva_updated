const { extractUserId } = require("../jwt");
const { isClinicAdmin } = require("../utils/checkUserRole");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: "Unauthorized",
      message: "No valid authorization token provided" 
    });
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  const userId = extractUserId(token);
  
  if (!userId) {
    return res.status(401).json({ 
      error: "Unauthorized",
      message: "Invalid or expired token" 
    });
  }

  // Attach user ID to request
  req.userId = userId;
  next();
}

// Middleware to verify user is a clinic admin
async function requireClinicAdmin(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ 
      error: "Unauthorized",
      message: "Authentication required" 
    });
  }

  const adminInfo = await isClinicAdmin(req.userId);
  if (!adminInfo) {
    return res.status(403).json({ 
      error: "Forbidden",
      message: "Only Clinic admins can perform this action" 
    });
  }

  // Attach admin info to request for use in controllers
  req.adminInfo = adminInfo;
  next();
}

module.exports = {
  requireAuth,
  requireClinicAdmin
};