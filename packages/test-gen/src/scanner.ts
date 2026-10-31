import * as ts from 'typescript';
import * as path from 'node:path';
import { glob } from 'glob';
import type { TestSpec, ComponentTestSpec } from './index.js';

export interface ScannedSpec {
  filePath: string;
  app: string;
  route: string;
  spec: TestSpec;
}

export interface ScannedComponentSpec {
  filePath: string;
  app: string;
  componentName: string;
  parentRoutes: string[];
  spec: ComponentTestSpec;
}

const COMPONENT_EXCLUDE_PATTERNS = [
  /[/\\]page\.tsx$/,
  /[/\\]layout\.tsx$/,
  /[/\\]loading\.tsx$/,
  /[/\\]error\.tsx$/,
  /[/\\]not-found\.tsx$/,
  /[/\\]Client[A-Z][^/\\]*\.tsx$/,
  /[/\\][A-Z][^/\\]*Client\.tsx$/,
  /[/\\]Illustrations?\.tsx$/,
];

/**
 * Check if a file path matches any of the component exclusion patterns.
 */
export function isExcludedComponent(filePath: string): boolean {
  return COMPONENT_EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Recursively evaluate a TypeScript AST node into a plain JS value.
 * Handles string literals, numeric literals, regex literals, arrays,
 * objects, and identifier keys.
 */
function evaluateNode(node: ts.Node): unknown {
  if (ts.isStringLiteral(node)) {
    return node.text;
  }

  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }

  if (ts.isRegularExpressionLiteral(node)) {
    const match = node.text.match(/^\/(.+)\/([gimsuy]*)$/);
    if (match) {
      return new RegExp(match[1], match[2]);
    }
    return node.text;
  }

  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map(el => evaluateNode(el));
  }

  if (ts.isObjectLiteralExpression(node)) {
    const obj: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        let key: string;
        if (ts.isIdentifier(prop.name)) {
          key = prop.name.text;
        } else if (ts.isStringLiteral(prop.name)) {
          key = prop.name.text;
        } else if (ts.isComputedPropertyName(prop.name)) {
          key = String(evaluateNode(prop.name.expression));
        } else {
          continue;
        }
        obj[key] = evaluateNode(prop.initializer);
      } else if (ts.isShorthandPropertyAssignment(prop)) {
        obj[prop.name.text] = prop.name.text;
      }
    }
    return obj;
  }

  if (ts.isPrefixUnaryExpression(node)) {
    if (node.operator === ts.SyntaxKind.MinusToken) {
      const operand = evaluateNode(node.operand);
      if (typeof operand === 'number') {
        return -operand;
      }
    }
  }

  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }

  if (ts.isIdentifier(node) && node.text === 'undefined') {
    return undefined;
  }

  // For `as` expressions (type assertions), evaluate the underlying expression
  if (ts.isAsExpression(node)) {
    return evaluateNode(node.expression);
  }

  // For parenthesized expressions
  if (ts.isParenthesizedExpression(node)) {
    return evaluateNode(node.expression);
  }

  // Handle `new X(args)` — supports new Date(), new RegExp(), etc.
  if (ts.isNewExpression(node)) {
    const ctorName = ts.isIdentifier(node.expression) ? node.expression.text : '';
    const SAFE_CONSTRUCTORS: Record<string, new (...args: any[]) => unknown> = {
      Date, RegExp, Array, Map, Set,
    };
    const Ctor = SAFE_CONSTRUCTORS[ctorName];
    if (Ctor) {
      const args = (node.arguments || []).map(a => evaluateNode(a));
      try { return new Ctor(...args); } catch { /* fall through */ }
    }
  }

  // Handle method calls: obj.method(args) — evaluates the chain at scan time
  if (ts.isCallExpression(node)) {
    if (ts.isPropertyAccessExpression(node.expression)) {
      const obj = evaluateNode(node.expression.expression);
      const method = node.expression.name.text;
      if (obj != null && typeof (obj as Record<string, unknown>)[method] === 'function') {
        const args = node.arguments.map(a => evaluateNode(a));
        try { return ((obj as Record<string, (...a: unknown[]) => unknown>)[method])(...args); } catch { /* fall through */ }
      }
    }
    // Handle standalone function calls like String(), Number()
    if (ts.isIdentifier(node.expression)) {
      const fnName = node.expression.text;
      const SAFE_FNS: Record<string, (...args: any[]) => unknown> = {
        String, Number, Boolean, parseInt: parseInt, parseFloat: parseFloat,
      };
      const fn = SAFE_FNS[fnName];
      if (fn) {
        const args = node.arguments.map(a => evaluateNode(a));
        try { return fn(...args); } catch { /* fall through */ }
      }
    }
  }

  // Handle property access: obj.prop
  if (ts.isPropertyAccessExpression(node)) {
    const obj = evaluateNode(node.expression);
    const prop = node.name.text;
    if (obj != null) {
      try { return (obj as Record<string, unknown>)[prop]; } catch { /* fall through */ }
    }
  }

  // Fallback: return the text of the node
  return undefined;
}

/**
 * Find the testSpec() call expression argument in a variable declaration.
 */
function findTestSpecArg(node: ts.Node): ts.ObjectLiteralExpression | undefined {
  if (ts.isCallExpression(node)) {
    const expr = node.expression;
    if (ts.isIdentifier(expr) && expr.text === 'testSpec') {
      const arg = node.arguments[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        return arg;
      }
    }
  }

  // Check if testSpec call is wrapped in a type assertion (e.g., testSpec({...}) as const)
  if (ts.isAsExpression(node)) {
    return findTestSpecArg(node.expression);
  }

  return undefined;
}

/**
 * Find the componentTestSpec() call expression argument in a variable declaration.
 */
function findComponentTestSpecArg(node: ts.Node): ts.ObjectLiteralExpression | undefined {
  if (ts.isCallExpression(node)) {
    const expr = node.expression;
    if (ts.isIdentifier(expr) && expr.text === 'componentTestSpec') {
      const arg = node.arguments[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        return arg;
      }
    }
  }

  if (ts.isAsExpression(node)) {
    return findComponentTestSpecArg(node.expression);
  }

  return undefined;
}

type ScanFileResult =
  | { kind: 'page'; spec: TestSpec }
  | { kind: 'component'; spec: ComponentTestSpec };

/**
 * Scan a single file for an exported __test variable with either testSpec() or componentTestSpec().
 * Returns a tagged result indicating the type of spec found.
 */
function scanFileTagged(filePath: string): ScanFileResult | undefined {
  const sourceText = ts.sys.readFile(filePath);
  if (!sourceText) return undefined;

  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  for (const statement of sourceFile.statements) {
    if (
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === '__test' && decl.initializer) {
          const pageObj = findTestSpecArg(decl.initializer);
          if (pageObj) {
            return { kind: 'page', spec: evaluateNode(pageObj) as TestSpec };
          }
          const compObj = findComponentTestSpecArg(decl.initializer);
          if (compObj) {
            return { kind: 'component', spec: evaluateNode(compObj) as ComponentTestSpec };
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Scan a single file for an exported __test variable with a testSpec() call.
 */
function scanFile(filePath: string): TestSpec | undefined {
  const result = scanFileTagged(filePath);
  if (result && result.kind === 'page') {
    return result.spec;
  }
  return undefined;
}

/**
 * Extract the app name from a file path.
 * e.g., "apps/web/app/slot-search/page.tsx" -> "web"
 */
function extractApp(filePath: string, rootDir: string): string {
  const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  // Expected: apps/<appName>/app/...
  if (parts[0] === 'apps' && parts.length > 1) {
    return parts[1];
  }
  return 'unknown';
}

/**
 * Extract the route from a file path.
 * e.g., "apps/web/app/slot-search/page.tsx" -> "/slot-search"
 * e.g., "apps/web/app/page.tsx" -> "/"
 */
function extractRoute(filePath: string, rootDir: string): string {
  const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  // Expected: apps/<appName>/app/<...route>/page.tsx
  const appIndex = parts.indexOf('app');
  if (appIndex === -1) return '/';

  const routeParts = parts.slice(appIndex + 1, -1); // Remove 'app' prefix and 'page.tsx'
  if (routeParts.length === 0) return '/';
  return '/' + routeParts.join('/');
}

/**
 * Scan all page files under the given root directory for testSpec exports.
 */
export async function scanSpecs(rootDir: string): Promise<ScannedSpec[]> {
  const pattern = 'apps/*/app/**/page.tsx';
  const files = await glob(pattern, { cwd: rootDir, absolute: true });

  const results: ScannedSpec[] = [];

  for (const filePath of files) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const spec = scanFile(normalizedPath);
    if (spec) {
      results.push({
        filePath: normalizedPath,
        app: extractApp(normalizedPath, rootDir),
        route: extractRoute(normalizedPath, rootDir),
        spec,
      });
    }
  }

  return results;
}

/**
 * Extract component name from a file path.
 * e.g., "apps/web/app/dashboard/AppointmentCard.tsx" -> "AppointmentCard"
 */
function extractComponentName(filePath: string): string {
  const basename = path.basename(filePath, '.tsx');
  return basename;
}

/**
 * Normalize parentRoute to an array.
 */
function normalizeParentRoutes(parentRoute: string | string[]): string[] {
  if (Array.isArray(parentRoute)) {
    return parentRoute;
  }
  return [parentRoute];
}

/**
 * Scan all component files (non-page .tsx) under the given root directory
 * for componentTestSpec exports.
 */
export async function scanComponentSpecs(rootDir: string): Promise<ScannedComponentSpec[]> {
  const pattern = 'apps/*/app/**/*.tsx';
  const files = await glob(pattern, { cwd: rootDir, absolute: true });

  const results: ScannedComponentSpec[] = [];

  for (const filePath of files) {
    const normalizedPath = filePath.replace(/\\/g, '/');

    if (isExcludedComponent(normalizedPath)) {
      continue;
    }

    const result = scanFileTagged(normalizedPath);
    if (result && result.kind === 'component') {
      results.push({
        filePath: normalizedPath,
        app: extractApp(normalizedPath, rootDir),
        componentName: extractComponentName(normalizedPath),
        parentRoutes: normalizeParentRoutes(result.spec.parentRoute),
        spec: result.spec,
      });
    }
  }

  return results;
}

/**
 * Return all component file paths (excluding patterns), used by the
 * validator/analyzer to check coverage.
 */
export async function scanAllComponentFiles(rootDir: string): Promise<string[]> {
  const pattern = 'apps/*/app/**/*.tsx';
  const files = await glob(pattern, { cwd: rootDir, absolute: true });

  const results: string[] = [];

  for (const filePath of files) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (!isExcludedComponent(normalizedPath)) {
      results.push(normalizedPath);
    }
  }

  return results;
}
