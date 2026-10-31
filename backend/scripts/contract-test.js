const fs = require('fs');
const path = require('path');
const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function loadSpec() {
  const specPath = path.join(__dirname, '..', 'swagger.json');
  return JSON.parse(fs.readFileSync(specPath, 'utf8'));
}

function validateSpec(spec) {
  const errors = [];

  // Validate info
  if (!spec.info?.title) errors.push('Missing info.title');
  if (!spec.info?.version) errors.push('Missing info.version');

  // Validate paths
  if (!spec.paths || Object.keys(spec.paths).length === 0) {
    errors.push('No paths defined');
  }

  for (const [pathStr, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (method.startsWith('x-')) continue;

      if (!operation.responses) {
        errors.push(`${method.toUpperCase()} ${pathStr}: missing responses`);
      }
      if (!operation.tags || operation.tags.length === 0) {
        errors.push(`${method.toUpperCase()} ${pathStr}: missing tags`);
      }
    }
  }

  return errors;
}

async function testEndpoint(method, pathStr, operation) {
  // Only test GET endpoints that don't require auth (Public tag)
  if (method !== 'get') return null;
  if (!operation.tags?.includes('Public')) return null;

  // Skip parameterized paths
  if (pathStr.includes('{')) return null;

  const url = `${BACKEND_URL}${pathStr}`;

  const expectedCodes = Object.keys(operation.responses).map(Number);

  return new Promise((resolve) => {
    const req = http.request(url, { method: 'GET', timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const passed = expectedCodes.includes(res.statusCode);
        resolve({
          method: method.toUpperCase(),
          path: pathStr,
          status: res.statusCode,
          passed,
          expected: expectedCodes,
        });
      });
    });

    req.on('error', () => {
      resolve({ method: method.toUpperCase(), path: pathStr, status: 0, passed: false, expected: expectedCodes, error: 'Connection failed' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ method: method.toUpperCase(), path: pathStr, status: 0, passed: false, expected: expectedCodes, error: 'Timeout' });
    });

    req.end();
  });
}

async function main() {
  console.log('Loading OpenAPI spec...');
  const spec = await loadSpec();

  // Schema validation
  console.log('\n--- Schema Validation ---');
  const schemaErrors = validateSpec(spec);
  if (schemaErrors.length === 0) {
    console.log('Schema validation passed!');
  } else {
    console.log(`Schema validation found ${schemaErrors.length} issue(s):`);
    schemaErrors.forEach(e => console.log(`  - ${e}`));
  }

  // Contract tests (if server is running)
  console.log('\n--- Contract Tests ---');
  const results = [];
  for (const [pathStr, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (method.startsWith('x-')) continue;
      const result = await testEndpoint(method, pathStr, operation);
      if (result) results.push(result);
    }
  }

  if (results.length === 0) {
    console.log('No testable endpoints found (or server not running).');
  } else {
    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);

    console.log(`Tested: ${results.length}, Passed: ${passed.length}, Failed: ${failed.length}`);

    for (const r of failed) {
      console.log(`  FAIL: ${r.method} ${r.path} - got ${r.status}, expected ${r.expected.join('|')}${r.error ? ` (${r.error})` : ''}`);
    }
  }

  // Exit code
  const hasSchemaErrors = schemaErrors.length > 0;
  process.exit(hasSchemaErrors ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
