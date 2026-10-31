const rateLimit = require('express-rate-limit');
const { extractUserId, verifyToken } = require('../jwt');
const { DEV_MODE } = require('../config/env');

function extractAdminId(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload.admin_id ? String(payload.admin_id) : null;
}

function createRateLimit(options) {
  if (DEV_MODE) {
    return (req, res, next) => next();
  }
  const { mode: rawMode, ...restOptions } = options;
  const mode = rawMode || 'user';

  let rateLimitConfig = {
    windowMs: restOptions.windowMs || 15 * 60 * 1000,
    max: restOptions.max || 100,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        message: restOptions.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.round((restOptions.windowMs || 15 * 60 * 1000) / 1000),
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...restOptions
  };

  if (mode === 'user') {
    rateLimitConfig.keyGenerator = (req) => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const userId = token ? extractUserId(token) : null;

      if (!userId) {
        throw new Error(
          `[RateLimiter] mode='user' but no valid JWT or user_id found in Authorization header.`
        );
      }

      return String(userId);
    };
  } else if (mode === 'admin') {
    rateLimitConfig.keyGenerator = (req) => {
      const adminId = extractAdminId(req);
      if (!adminId) {
        throw new Error(
          `[RateLimiter] mode='admin' but no valid admin JWT or admin_id found in Authorization header.`
        );
      }
      return `admin:${adminId}`;
    };
  } else {
    rateLimitConfig.keyGenerator = (req) => {
      const realIP = req.socket.remoteAddress || 
                    req.connection.remoteAddress || 
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);
      
      if (!realIP) {
        throw new Error('[RateLimiter] Unable to determine client IP from TCP connection');
      }

      let normalizedIP = realIP.toLowerCase().trim();
      try {
        const net = require('net');
        if (net.isIPv6(realIP)) {
          const ipv4MappedRegex = /(?:::(?:0{1,4}:){0,4})?ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
          const ipv4Match = normalizedIP.match(ipv4MappedRegex);
          
          if (ipv4Match && net.isIPv4(ipv4Match[1])) {
            normalizedIP = ipv4Match[1];
          } else {
            const parts = normalizedIP.split(':');
            const normalizedParts = parts.map(part => {
              if (part === '') return part;
              return parseInt(part, 16).toString(16);
            });
            normalizedIP = normalizedParts.join(':');
            normalizedIP = normalizedIP.replace(/(^|:)(0:){2,}/g, '::');
            normalizedIP = normalizedIP.replace(/^0::/, '::');
          }
        } else if (net.isIPv4(realIP)) {
          normalizedIP = realIP;
        } else {
          throw new Error('Invalid IP format');
        }
      } catch (err) {
        console.warn(`[RateLimiter] IP normalization failed for ${realIP}:`, err.message);
        normalizedIP = realIP;
      }
      // console.log(`[RateLimiter] Using secure TCP IP: ${normalizedIP} (original: ${realIP})`);
      return normalizedIP;
    };
  }
  return rateLimit(rateLimitConfig);
}

module.exports = { createRateLimit };
