import type { TestSpec, ElementLocator, TestStep, TestFlow, SeedApi } from './index.js';
import type { ScannedSpec, ScannedComponentSpec } from './scanner.js';
import { resolveFlowOrder } from './resolver.js';

const BACKEND_EXPR = '`${process.env.BACKEND_URL || \'http://localhost:5000\'}`';

function emitSeedBlock(lines: string[], seed: SeedApi, route: string): void {
  lines.push(`  let testRoute = '${escapeString(route)}';`);
  lines.push(`  let seededId: number;`);
  lines.push('');
  lines.push(`  test.beforeEach(async () => {`);

  if (seed.resolveEntities) {
    lines.push(`    const entRes = await fetch(\`\${process.env.BACKEND_URL || 'http://localhost:5000'}/api/test/resolve-test-entities\`);`);
    lines.push(`    if (!entRes.ok) throw new Error(\`resolve-test-entities failed: \${entRes.status}\`);`);
    lines.push(`    const ent = await entRes.json();`);
  }

  lines.push(`    const res = await fetch(\`\${process.env.BACKEND_URL || 'http://localhost:5000'}${escapeString(seed.endpoint)}\`, {`);
  lines.push(`      method: '${seed.method}',`);
  lines.push(`      headers: { 'Content-Type': 'application/json' },`);

  if (seed.resolveEntities) {
    const dateFields = Object.entries(seed.body).filter(([, v]) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v as string)).map(([k]) => k);
    const staticBody = { ...seed.body };
    const entityMappings: Record<string, string> = {
      doctor_id: 'ent.doctor_id',
      user_id: 'ent.patient_user_id',
      slot_id: 'ent.slot_id',
      phone: 'ent.patient_phone',
    };
    for (const key of Object.keys(entityMappings)) {
      delete staticBody[key];
    }
    const overrides = Object.entries(entityMappings)
      .filter(([k]) => k in seed.body)
      .map(([k, v]) => `${k}: ${v}`)
      .concat(dateFields.map(f => `${f}: new Date().toISOString().slice(0, 10)`));
    lines.push(`      body: JSON.stringify({...${JSON.stringify(staticBody)}, ${overrides.join(', ')}}),`);
  } else {
    const dateFields = Object.entries(seed.body).filter(([, v]) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v as string)).map(([k]) => k);
    if (dateFields.length > 0) {
      lines.push(`      body: JSON.stringify({...${JSON.stringify(seed.body)}, ${dateFields.map(f => `${f}: new Date().toISOString().slice(0, 10)`).join(', ')}}),`);
    } else {
      lines.push(`      body: JSON.stringify(${JSON.stringify(seed.body)}),`);
    }
  }

  lines.push(`    });`);
  lines.push(`    if (!res.ok) throw new Error(\`Seed API failed: \${res.status}\`);`);
  lines.push(`    const data = await res.json();`);
  lines.push(`    seededId = data.${escapeString(seed.routeParam)};`);
  lines.push(`    testRoute = testRoute.replace(/\\d+$/, String(seededId));`);
  lines.push(`  });`);
  lines.push('');
  lines.push(`  test.afterEach(async () => {`);
  lines.push(`    if (seededId) {`);
  lines.push(`      await fetch(\`\${process.env.BACKEND_URL || 'http://localhost:5000'}/api/test/appointment/\${seededId}\`, { method: 'DELETE' });`);
  lines.push(`    }`);
  lines.push(`  });`);
  lines.push('');
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

/**
 * Generate a Playwright locator expression from an ElementLocator.
 */
function locatorToCode(locator: ElementLocator): string {
  if ('role' in locator) {
    const name = locator.name;
    const exact = 'exact' in locator && locator.exact ? ', exact: true' : '';
    if (name === undefined || name === null) {
      return `page.getByRole('${locator.role}')`;
    }
    if (name instanceof RegExp) {
      return `page.getByRole('${locator.role}', { name: ${name.toString()}${exact} })`;
    }
    return `page.getByRole('${locator.role}', { name: '${escapeString(String(name))}'${exact} })`;
  }
  if ('testId' in locator) {
    return `page.getByTestId('${escapeString(locator.testId)}')`;
  }
  if ('text' in locator) {
    const text = locator.text;
    if (text instanceof RegExp) {
      return `page.getByText(${text.toString()})`;
    }
    return `page.getByText('${escapeString(String(text))}')`;
  }
  return `page.locator('unknown')`;
}

/**
 * Escape single quotes in strings for code generation.
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Generate a human-readable step description.
 */
function stepDescription(step: TestStep, elements: Record<string, ElementLocator>): string {
  if (step.do) {
    const target = step.on ? resolveElementName(step.on, elements) : '';
    switch (step.do) {
      case 'click': return `Click: ${target}`;
      case 'fill': return `Fill: ${target} with "${step.value}"`;
      case 'select': return `Select: "${step.value}" in ${target}`;
      case 'check': return `Check: ${target}`;
      case 'hover': return `Hover: ${target}`;
      case 'press': return `Press: ${step.value}`;
      case 'waitFor': return `Wait for: ${target}`;
      case 'jsClick': return `JS Click: ${target}`;
      case 'type': return `Type: "${step.value}" into ${target}`;
      case 'reactFill': return `React fill: ${target} with "${step.value}"`;
      case 'clickNewTab': return `Click ${target} opens new tab${step.value ? ` at "${step.value}"` : ''}`;
      case 'comboboxSelect': return `Select option: "${step.value}" in ${target}`;
      case 'comboboxSelectFirst': return `Select first option in: ${target}`;
      case 'fillFromSlotDay': return `Fill date matching slot day from: ${step.value}`;
      case 'resolveAndFill': return `Resolve ${step.value} and fill: ${target}`;
      case 'uploadFile': return `Upload file: "${step.value}" via ${target}`;
      case 'reload': return `Reload page`;
      case 'navigate': return `Navigate to: ${step.value}`;
      case 'screenshot': return `Screenshot: ${step.value}`;
      default: return `Action: ${step.do}`;
    }
  }
  if (step.expect) {
    const target = step.on ? resolveElementName(step.on, elements) : '';
    switch (step.expect) {
      case 'visible': return `Assert: ${target} visible`;
      case 'hidden': return `Assert: ${target} hidden`;
      case 'text': return `Assert: ${target} has text "${step.value}"`;
      case 'value': return `Assert: ${target} has value "${step.value}"`;
      case 'url': return `Assert: URL is "${step.value}"`;
      case 'urlContains': return `Assert: URL contains "${step.value}"`;
      case 'count': return `Assert: ${target} count is ${step.value}`;
      case 'countMin': return `Assert: ${target} count >= ${step.value}`;
      case 'countMax': return `Assert: ${target} count <= ${step.value}`;
      case 'hasClass': return `Assert: ${target} has class "${step.value}"`;
      case 'enabled': return `Assert: ${target} enabled`;
      case 'disabled': return `Assert: ${target} disabled`;
      case 'checked': return `Assert: ${target} checked`;
      default: return `Assert: ${step.expect}`;
    }
  }
  return 'Unknown step';
}

/**
 * Resolve an element name to a human-readable label.
 */
function resolveElementName(key: string, elements: Record<string, ElementLocator>): string {
  const el = elements[key];
  if (!el) return key;
  if ('role' in el) return `${String(el.name)} ${el.role}`;
  if ('testId' in el) return el.testId;
  if ('text' in el) return String(el.text);
  return key;
}

/**
 * Generate the code for a single step.
 */
function generateStepCode(
  step: TestStep,
  elements: Record<string, ElementLocator>,
  indent: string
): string {
  const lines: string[] = [];

  if (step.do) {
    const locator = step.on ? locatorToCode(elements[step.on]) : '';

    switch (step.do) {
      case 'click':
        lines.push(`${indent}await ${locator}.first().click();`);
        break;
      case 'fill':
        lines.push(`${indent}await ${locator}.fill('${escapeString(String(step.value))}');`);
        break;
      case 'select':
        lines.push(`${indent}await ${locator}.selectOption('${escapeString(String(step.value))}');`);
        break;
      case 'check':
        lines.push(`${indent}await ${locator}.check();`);
        break;
      case 'hover':
        lines.push(`${indent}await ${locator}.hover();`);
        break;
      case 'press':
        lines.push(`${indent}await ${locator}.press('${escapeString(String(step.value))}');`);
        break;
      case 'waitFor':
        lines.push(`${indent}await ${locator}.first().waitFor({ timeout: 30000 });`);
        break;
      case 'jsClick':
        lines.push(`${indent}await ${locator}.waitFor();`);
        lines.push(`${indent}await ${locator}.evaluate(el => (el as HTMLElement).click());`);
        break;
      case 'type':
        lines.push(`${indent}await ${locator}.waitFor();`);
        lines.push(`${indent}await ${locator}.fill('${escapeString(String(step.value))}');`);
        break;
      case 'reactFill':
        lines.push(`${indent}await ${locator}.scrollIntoViewIfNeeded();`);
        lines.push(`${indent}await ${locator}.evaluate((el, val) => { (el as HTMLInputElement).focus(); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!; s.call(el, val); const t = (el as any)._valueTracker; if (t) t.setValue(''); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, '${escapeString(String(step.value))}');`);
        break;
      case 'uploadFile':
        lines.push(`${indent}const [fc] = await Promise.all([page.waitForEvent('filechooser'), ${locator}.click()]);`);
        lines.push(`${indent}await fc.setFiles(path.join(process.cwd(), '${escapeString(String(step.value))}'));`);
        break;
      case 'clickNewTab':
        lines.push(`${indent}const [popup] = await Promise.all([page.context().waitForEvent('page'), ${locator}.click()]);`);
        if (step.value) {
          lines.push(`${indent}await expect(popup).toHaveURL(/${escapeRegex(String(step.value))}/);`);
          lines.push(`${indent}await popup.close();`);
        }
        break;
      case 'comboboxSelect':
        lines.push(`${indent}await ${locator}.click();`);
        lines.push(`${indent}await page.getByRole('option', { name: '${escapeString(String(step.value))}' }).click();`);
        break;
      case 'comboboxSelectFirst':
        lines.push(`${indent}await ${locator}.click();`);
        lines.push(`${indent}await page.getByRole('listbox').getByRole('option').first().waitFor();`);
        lines.push(`${indent}await page.getByRole('listbox').getByRole('option').nth(1).click();`);
        break;
      case 'fillFromSlotDay': {
        const comboboxName = String(step.value);
        lines.push(`${indent}const slotBtnText = await page.getByRole('combobox', { name: '${escapeString(comboboxName)}' }).innerText();`);
        lines.push(`${indent}const slotDayMatch = slotBtnText.match(/(MON|TUE|WED|THU|FRI|SAT|SUN)/);`);
        lines.push(`${indent}if (slotDayMatch) {`);
        lines.push(`${indent}  const targetDay = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }[slotDayMatch[1]!]!;`);
        lines.push(`${indent}  const dateObj = new Date();`);
        lines.push(`${indent}  const diff = (targetDay - dateObj.getDay() + 7) % 7;`);
        lines.push(`${indent}  dateObj.setDate(dateObj.getDate() + (diff === 0 ? 7 : diff));`);
        lines.push(`${indent}  const yyyy = dateObj.getFullYear();`);
        lines.push(`${indent}  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');`);
        lines.push(`${indent}  const dd = String(dateObj.getDate()).padStart(2, '0');`);
        lines.push(`${indent}  await ${locator}.fill(\`\${yyyy}-\${mm}-\${dd}\`);`);
        lines.push(`${indent}}`);
        break;
      }
      case 'resolveAndFill': {
        const field = String(step.value);
        lines.push(`${indent}const entRes = await fetch(\`\${process.env.BACKEND_URL || 'http://localhost:5000'}/api/test/resolve-test-entities\`);`);
        lines.push(`${indent}if (!entRes.ok) throw new Error(\`resolve-test-entities failed: \${entRes.status}\`);`);
        lines.push(`${indent}const ent = await entRes.json();`);
        lines.push(`${indent}await ${locator}.fill(String(ent.${field}));`);
        break;
      }
      case 'reload':
        lines.push(`${indent}await page.reload();`);
        lines.push(`${indent}await page.waitForLoadState('load');`);
        break;
      case 'navigate':
        lines.push(`${indent}await page.goto('${escapeString(String(step.value))}');`);
        break;
      case 'screenshot':
        lines.push(`${indent}await page.screenshot({ path: '${escapeString(String(step.value))}' });`);
        break;
    }
  }

  if (step.expect) {
    const locator = step.on ? locatorToCode(elements[step.on]) : '';

    switch (step.expect) {
      case 'visible': {
        lines.push(`${indent}await expect(${locator}).toBeVisible();`);
        const el = step.on ? elements[step.on] : null;
        if (el && 'testId' in el && (el as { testId: string }).testId.startsWith('toast-')) {
          lines.push(`${indent}await ${locator}.first().waitFor({ state: 'hidden', timeout: 10000 });`);
        }
        break;
      }
      case 'hidden':
        lines.push(`${indent}await expect(${locator}).toBeHidden();`);
        break;
      case 'text':
        lines.push(`${indent}await expect(${locator}).toHaveText(${formatValue(step.value)});`);
        break;
      case 'value':
        lines.push(`${indent}await expect(${locator}).toHaveValue(${formatValue(step.value)});`);
        break;
      case 'url':
        lines.push(`${indent}await expect(page).toHaveURL('${escapeString(String(step.value))}');`);
        break;
      case 'urlContains':
        lines.push(`${indent}await expect(page).toHaveURL(/${escapeRegex(String(step.value))}/);`);
        break;
      case 'count':
        lines.push(`${indent}await expect(${locator}).toHaveCount(${step.value});`);
        break;
      case 'countMin': {
        lines.push(`${indent}const count = await ${locator}.count();`);
        lines.push(`${indent}expect(count).toBeGreaterThanOrEqual(${step.value});`);
        break;
      }
      case 'countMax': {
        lines.push(`${indent}const count = await ${locator}.count();`);
        lines.push(`${indent}expect(count).toBeLessThanOrEqual(${step.value});`);
        break;
      }
      case 'hasClass':
        lines.push(`${indent}await expect(${locator}).toHaveClass(/${escapeRegex(String(step.value))}/);`);
        break;
      case 'enabled':
        lines.push(`${indent}await expect(${locator}).toBeEnabled();`);
        break;
      case 'disabled':
        lines.push(`${indent}await expect(${locator}).toBeDisabled();`);
        break;
      case 'checked':
        lines.push(`${indent}await expect(${locator}).toBeChecked();`);
        break;
    }
  }

  return lines.join('\n');
}

/**
 * Escape special regex characters in a string for embedding in a RegExp literal.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * Format a value for code generation. If the value is a RegExp, return its source as a regex literal.
 * Otherwise, return a quoted string.
 */
function formatValue(value: unknown): string {
  if (value instanceof RegExp) {
    return value.toString();
  }
  return `'${escapeString(String(value))}'`;
}

/**
 * Extract the auth role from an AuthPreset.
 */
function getAuthRole(auth: string): string | null {
  if (auth === 'none' || auth === 'optional') return null;
  if (auth === 'required') return 'patient';
  if (auth.startsWith('role:')) return auth.slice(5);
  return null;
}

const APP_TOKEN_KEYS: Record<string, string> = {
  web: 'patient_token',
  admin: 'admin_token',
  doctor: 'doctor_token',
  clinic: 'clinic_token',
};

function getTokenKey(app: string): string {
  return APP_TOKEN_KEYS[app] || 'auth_token';
}

/**
 * Collect all steps for a flow, including steps from `after` dependency flows.
 */
function collectFlowSteps(flow: TestFlow, flowMap: Map<string, TestFlow>): TestStep[] {
  const steps: TestStep[] = [];
  if (flow.after) {
    const parents = Array.isArray(flow.after) ? flow.after : [flow.after];
    for (const parentName of parents) {
      const dep = flowMap.get(parentName);
      if (dep) {
        steps.push(...collectFlowSteps(dep, flowMap));
      }
    }
  }
  steps.push(...flow.steps);
  return steps;
}

/**
 * Generate a complete Playwright test file from a scanned spec.
 */
export function generateTestFile(scanned: ScannedSpec): string {
  const { spec } = scanned;
  const lines: string[] = [];

  const role = getAuthRole(spec.auth);
  const hasSeed = !!spec.seedApi;

  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push(`import * as fs from 'fs';`);
  lines.push(`import * as path from 'path';`);
  if (role) {
    lines.push(`import { readAuthToken } from '../../fixtures/auth';`);
  }
  lines.push('');
  lines.push(`const SHOT_DIR = path.resolve(__dirname, '../../testing_screenshots/${escapeString(spec.app)}');`);
  lines.push('');

  lines.push(`test.describe('${escapeString(spec.title)}', () => {`);

  if (hasSeed) {
    emitSeedBlock(lines, spec.seedApi!, spec.route);
  }

  const routeExpr = hasSeed ? 'testRoute' : `'${escapeString(spec.route)}'`;

  const orderedFlows = resolveFlowOrder(spec.flows);

  const flowMap = new Map<string, TestFlow>();
  for (const flow of orderedFlows) {
    flowMap.set(flow.name, flow);
  }

  for (const flow of orderedFlows) {
    const allSteps = collectFlowSteps(flow, flowMap);

    lines.push(`  test('${escapeString(flow.name)}', async ({ page }) => {`);

    if (role) {
      lines.push(`    await test.step('Authenticate as ${role}', async () => {`);
      lines.push(`      await page.goto('/login');`);
      lines.push(`      const token = readAuthToken('${role}');`);
      lines.push(`      await page.evaluate(({ key, val }) => localStorage.setItem(key, val), { key: '${escapeString(getTokenKey(spec.app))}', val: token });`);
      lines.push(`      await page.goto(${routeExpr});`);
      lines.push(`    });`);
    } else {
      lines.push(`    await test.step('Navigate to ${escapeString(spec.route)}', async () => {`);
      lines.push(`      await page.goto(${routeExpr});`);
      lines.push(`    });`);
    }

    let stepIdx = 0;
    for (const step of allSteps) {
      stepIdx++;
      const desc = stepDescription(step, spec.elements);
      const code = generateStepCode(step, spec.elements, '      ');
      const shotSlug = slugify(flow.name);
      const shotFile = `\${SHOT_DIR}/${escapeString(shotSlug)}/step-${String(stepIdx).padStart(2, '0')}-${slugify(desc)}.png`;

      lines.push(`    await test.step('${escapeString(desc)}', async () => {`);
      lines.push(code);
      lines.push(`      const d = path.dirname(\`${shotFile}\`); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });`);
      lines.push(`      await page.screenshot({ path: \`${shotFile}\` });`);
      lines.push(`    });`);
    }

    lines.push(`  });`);
    lines.push('');
  }

  lines.push(`});`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate a merged Playwright test file from a page spec and its component specs.
 * Component flows are nested as `test.describe` blocks inside the page describe block.
 */
export function generateMergedTestFile(
  scanned: ScannedSpec,
  componentSpecs: ScannedComponentSpec[]
): string {
  const { spec } = scanned;
  const lines: string[] = [];

  const role = getAuthRole(spec.auth);

  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push(`import * as fs from 'fs';`);
  lines.push(`import * as path from 'path';`);
  if (role) {
    lines.push(`import { readAuthToken } from '../../fixtures/auth';`);
  }
  lines.push('');
  lines.push(`const SHOT_DIR = path.resolve(__dirname, '../../testing_screenshots/${escapeString(spec.app)}');`);
  lines.push('');

  const hasSeed = !!spec.seedApi;

  lines.push(`test.describe('${escapeString(spec.title)}', () => {`);

  if (hasSeed) {
    emitSeedBlock(lines, spec.seedApi!, spec.route);
  }

  const routeExpr = hasSeed ? 'testRoute' : `'${escapeString(spec.route)}'`;

  const orderedFlows = resolveFlowOrder(spec.flows);

  const flowMap = new Map<string, TestFlow>();
  for (const flow of orderedFlows) {
    flowMap.set(flow.name, flow);
  }

  for (const flow of orderedFlows) {
    const allSteps = collectFlowSteps(flow, flowMap);

    lines.push(`  test('${escapeString(flow.name)}', async ({ page }) => {`);

    if (role) {
      lines.push(`    await test.step('Authenticate as ${role}', async () => {`);
      lines.push(`      await page.goto('/login');`);
      lines.push(`      const token = readAuthToken('${role}');`);
      lines.push(`      await page.evaluate(({ key, val }) => localStorage.setItem(key, val), { key: '${escapeString(getTokenKey(spec.app))}', val: token });`);
      lines.push(`      await page.goto(${routeExpr});`);
      lines.push(`    });`);
    } else {
      lines.push(`    await test.step('Navigate to ${escapeString(spec.route)}', async () => {`);
      lines.push(`      await page.goto(${routeExpr});`);
      lines.push(`    });`);
    }

    let stepIdx = 0;
    for (const step of allSteps) {
      stepIdx++;
      const desc = stepDescription(step, spec.elements);
      const code = generateStepCode(step, spec.elements, '      ');
      const shotSlug = slugify(flow.name);
      const shotFile = `\${SHOT_DIR}/${escapeString(shotSlug)}/step-${String(stepIdx).padStart(2, '0')}-${slugify(desc)}.png`;

      lines.push(`    await test.step('${escapeString(desc)}', async () => {`);
      lines.push(code);
      lines.push(`      const d = path.dirname(\`${shotFile}\`); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });`);
      lines.push(`      await page.screenshot({ path: \`${shotFile}\` });`);
      lines.push(`    });`);
    }

    lines.push(`  });`);
    lines.push('');
  }

  // Generate nested describe blocks for each component
  for (const compSpec of componentSpecs) {
    const comp = compSpec.spec;

    lines.push(`  test.describe('${escapeString(comp.title)}', () => {`);

    // Resolve flow order for component
    const compOrderedFlows = resolveFlowOrder(comp.flows);

    // Build flow map for component dependency resolution
    const compFlowMap = new Map<string, TestFlow>();
    for (const flow of compOrderedFlows) {
      compFlowMap.set(flow.name, flow);
    }

    for (const flow of compOrderedFlows) {
      const allSteps = collectFlowSteps(flow, compFlowMap);

      lines.push(`    test('${escapeString(flow.name)}', async ({ page }) => {`);

      if (role) {
        lines.push(`      await test.step('Authenticate as ${role}', async () => {`);
        lines.push(`        await page.goto('/login');`);
        lines.push(`        const token = readAuthToken('${role}');`);
        lines.push(`        await page.evaluate(({ key, val }) => localStorage.setItem(key, val), { key: '${escapeString(getTokenKey(spec.app))}', val: token });`);
        lines.push(`        await page.goto(${routeExpr});`);
        lines.push(`      });`);
      } else {
        lines.push(`      await test.step('Navigate to ${escapeString(spec.route)}', async () => {`);
        lines.push(`        await page.goto(${routeExpr});`);
        lines.push(`      });`);
      }

      // Component flow steps use the component's own elements
      let compStepIdx = 0;
      for (const step of allSteps) {
        compStepIdx++;
        const desc = stepDescription(step, comp.elements);
        const code = generateStepCode(step, comp.elements, '        ');
        const shotSlug = slugify(`${comp.title}-${flow.name}`);
        const shotFile = `\${SHOT_DIR}/${escapeString(shotSlug)}/step-${String(compStepIdx).padStart(2, '0')}-${slugify(desc)}.png`;

        lines.push(`      await test.step('${escapeString(desc)}', async () => {`);
        lines.push(code);
        lines.push(`        const d = path.dirname(\`${shotFile}\`); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });`);
        lines.push(`        await page.screenshot({ path: \`${shotFile}\` });`);
        lines.push(`      });`);
      }

      lines.push(`    });`);
      lines.push('');
    }

    lines.push(`  });`);
    lines.push('');
  }

  lines.push(`});`);
  lines.push('');

  return lines.join('\n');
}
