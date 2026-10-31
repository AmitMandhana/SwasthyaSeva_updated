const fs = require('fs');
const path = require('path');

const ROUTE_FILES = {
  'authRoutes.js': '/api/auth',
  'publicRoutes.js': '/api/public',
  'adminRoutes.js': '/api/admin',
  'doctorRoutes.js': '/api/doctor',
  'clinicRoutes.js': '/api/clinic',
  'patientRoutes.js': '/api/patient',
  'userRoutes.js': '/api',
};

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

/**
 * Extract route definitions from a route file using regex.
 * Looks for patterns like: router.get('/path', ...) or router.post("/path", ...)
 */
function extractRoutes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];

  // Match router.<method>('<path>' or router.<method>("<path>"
  const pattern = /router\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/gi;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const method = match[1].toLowerCase();
    const routePath = match[3];
    routes.push({ method, path: routePath });
  }

  return routes;
}

/**
 * Normalize a route path for comparison with swagger paths.
 * Converts Express-style params (:param) to Swagger-style ({param}).
 */
function expressToSwagger(routePath) {
  return routePath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
}

/**
 * Extract documented paths from swagger.json.
 * Returns a Set of "METHOD /path" strings.
 */
function extractSwaggerPaths(swaggerPath) {
  const swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
  const documented = new Set();

  if (!swagger.paths) return documented;

  for (const [pathKey, methods] of Object.entries(swagger.paths)) {
    for (const method of Object.keys(methods)) {
      if (METHODS.includes(method.toLowerCase())) {
        documented.add(`${method.toUpperCase()} ${pathKey}`);
      }
    }
  }

  return documented;
}

function main() {
  const routesDir = path.join(__dirname, '..', 'routes');
  const swaggerPath = path.join(__dirname, '..', 'swagger.json');

  if (!fs.existsSync(swaggerPath)) {
    console.error('ERROR: swagger.json not found. Run "npm run swagger" first.');
    process.exit(1);
  }

  const documented = extractSwaggerPaths(swaggerPath);
  const missing = [];
  let totalRoutes = 0;

  for (const [file, prefix] of Object.entries(ROUTE_FILES)) {
    const filePath = path.join(routesDir, file);

    if (!fs.existsSync(filePath)) {
      console.warn(`WARN: Route file not found: ${file}`);
      continue;
    }

    const routes = extractRoutes(filePath);

    for (const route of routes) {
      totalRoutes++;
      const swaggerPath = `${prefix}${expressToSwagger(route.path)}`;
      const key = `${route.method.toUpperCase()} ${swaggerPath}`;

      if (!documented.has(key)) {
        missing.push({ file, method: route.method.toUpperCase(), path: swaggerPath, key });
      }
    }
  }

  // Report
  const coveredCount = totalRoutes - missing.length;
  const pct = totalRoutes > 0 ? ((coveredCount / totalRoutes) * 100).toFixed(1) : '100.0';

  console.log('\n=== Swagger Route Coverage Report ===\n');
  console.log(`Total routes found:    ${totalRoutes}`);
  console.log(`Documented in swagger: ${coveredCount}`);
  console.log(`Missing documentation: ${missing.length}`);
  console.log(`Coverage:              ${pct}%\n`);

  if (missing.length > 0) {
    console.log('Undocumented routes:\n');
    for (const m of missing) {
      console.log(`  ${m.method} ${m.path}  (${m.file})`);
    }
    console.log('');
    process.exit(1);
  } else {
    console.log('All routes are documented in swagger.json!\n');
  }
}

main();
