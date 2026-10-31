import { glob } from 'glob';
import { scanSpecs, scanComponentSpecs, scanAllComponentFiles, type ScannedSpec, type ScannedComponentSpec } from './scanner.js';
import { auditJsx, crossValidateElements, mergeAudits, type JsxAudit } from './jsx-validator.js';
import { flattenTreeToPaths } from './resolver.js';
import type {
  LocatorRole,
  ElementLocator,
  AuthPreset,
  AppName,
  ActionType,
  AssertionType,
  TestSpec,
  ComponentTestSpec,
  TestFlow,
  TestStep,
} from './index.js';

// ── Valid values (derived from the union types in index.ts) ──────────────

const VALID_ROLES: ReadonlySet<string> = new Set<LocatorRole>([
  'button', 'link', 'heading', 'textbox', 'checkbox', 'radio', 'combobox',
  'tab', 'tabpanel', 'dialog', 'alert', 'navigation', 'list', 'listitem',
  'cell', 'row', 'img', 'menuitem', 'menu', 'switch', 'slider',
  'spinbutton', 'progressbar', 'status', 'region', 'group', 'option',
]);

const VALID_AUTH_PRESETS: ReadonlySet<string> = new Set<AuthPreset>([
  'none', 'optional', 'required',
  'role:admin', 'role:doctor', 'role:clinic', 'role:clinic_admin', 'role:patient',
]);

const VALID_APP_NAMES: ReadonlySet<string> = new Set<AppName>([
  'web', 'admin', 'doctor', 'clinic',
]);

const VALID_ACTIONS: ReadonlySet<string> = new Set<ActionType>([
  'click', 'fill', 'select', 'check', 'hover', 'press', 'waitFor', 'navigate', 'screenshot',
  'jsClick', 'type', 'clickNewTab', 'comboboxSelect', 'comboboxSelectFirst', 'fillFromSlotDay', 'reactFill', 'reload', 'resolveAndFill', 'uploadFile',
]);

const VALID_ASSERTIONS: ReadonlySet<string> = new Set<AssertionType>([
  'visible', 'not.visible', 'hidden', 'text', 'value', 'url', 'urlContains',
  'navigation', 'count', 'countMin', 'countMax', 'hasClass', 'enabled', 'disabled', 'checked',
]);

const ACTIONS_REQUIRING_VALUE: ReadonlySet<string> = new Set<string>([
  'fill', 'select', 'press', 'navigate',
]);

const ASSERTIONS_REQUIRING_VALUE: ReadonlySet<string> = new Set<string>([
  'text', 'value', 'url', 'urlContains', 'count', 'countMin', 'countMax', 'hasClass',
]);

// ── Result types ─────────────────────────────────────────────────────────

export interface ValidationError {
  file: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  totalFiles: number;
  filesWithSpecs: number;
  filesMissingSpecs: number;
  totalComponentFiles: number;
  componentsWithSpecs: number;
  componentsMissingSpecs: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ── Helpers ──────────────────────────────────────────────────────────────

function err(file: string, message: string, field?: string): ValidationError {
  return { file, field, message, severity: 'error' };
}

function warn(file: string, message: string, field?: string): ValidationError {
  return { file, field, message, severity: 'warning' };
}

// ── Locator validation ──────────────────────────────────────────────────

function validateLocator(
  file: string,
  key: string,
  locator: Record<string, unknown>,
): ValidationError[] {
  const issues: ValidationError[] = [];
  const field = `elements.${key}`;

  const locatorKeys = Object.keys(locator);

  // Determine the locator shape
  if ('role' in locator && 'name' in locator) {
    // { role, name } shape
    const extraKeys = locatorKeys.filter(k => k !== 'role' && k !== 'name' && k !== 'exact');
    if (extraKeys.length > 0) {
      issues.push(err(file, `Unexpected keys in role locator: ${extraKeys.join(', ')}`, field));
    }
    if (typeof locator.role !== 'string' || !VALID_ROLES.has(locator.role)) {
      issues.push(err(file, `Invalid ARIA role "${String(locator.role)}". Must be one of: ${[...VALID_ROLES].join(', ')}`, field));
    }
    if (typeof locator.name !== 'string' && !(locator.name instanceof RegExp)) {
      issues.push(err(file, `"name" must be a string or RegExp`, field));
    }
  } else if ('testId' in locator) {
    const extraKeys = locatorKeys.filter(k => k !== 'testId');
    if (extraKeys.length > 0) {
      issues.push(err(file, `Unexpected keys in testId locator: ${extraKeys.join(', ')}`, field));
    }
    if (typeof locator.testId !== 'string') {
      issues.push(err(file, `"testId" must be a string`, field));
    }
  } else if ('text' in locator && !('css' in locator)) {
    const extraKeys = locatorKeys.filter(k => k !== 'text');
    if (extraKeys.length > 0) {
      issues.push(err(file, `Unexpected keys in text locator: ${extraKeys.join(', ')}`, field));
    }
    if (typeof locator.text !== 'string' && !(locator.text instanceof RegExp)) {
      issues.push(err(file, `"text" must be a string or RegExp`, field));
    }
  } else if ('css' in locator) {
    issues.push(err(file, `CSS selectors are not allowed. Use { testId }, { role, name }, or { text } instead`, field));
  } else {
    issues.push(err(
      file,
      `Invalid locator shape. Must be one of: { role, name }, { testId }, or { text }`,
      field,
    ));
  }

  return issues;
}

// ── E2E naming convention rules ─────────────────────────────────────────
// Element keys whose fill values must start with a specific prefix for cleanup.
// See docs/e2e-testing-standards.md § "E2E Account Naming Convention".

const E2E_FILL_PREFIX_RULES: ReadonlyMap<string, { prefix: string; label: string }> = new Map([
  ['newColumnInput', { prefix: '[E2E]', label: 'softboard column title' }],
  ['renameColumnInput', { prefix: '[E2E]', label: 'softboard column title' }],
  ['newCardInput', { prefix: '[E2E]', label: 'softboard card title' }],
  ['editCardTitleInput', { prefix: '[E2E]', label: 'softboard card title' }],
  ['editCardDescInput', { prefix: '[E2E]', label: 'softboard card description' }],
]);

// ── Step validation ─────────────────────────────────────────────────────

function validateStep(
  file: string,
  flowName: string,
  stepIndex: number,
  step: TestStep,
  elementKeys: Set<string>,
): ValidationError[] {
  const issues: ValidationError[] = [];
  const field = `flows["${flowName}"].steps[${stepIndex}]`;

  // Must have at least `do` or `expect`
  if (step.do == null && step.expect == null) {
    issues.push(err(file, `Step must have at least "do" (action) or "expect" (assertion)`, field));
  }

  // Validate `do`
  if (step.do != null) {
    if (!VALID_ACTIONS.has(step.do)) {
      issues.push(err(file, `Invalid action "${step.do}". Must be one of: ${[...VALID_ACTIONS].join(', ')}`, field + '.do'));
    }
    if (ACTIONS_REQUIRING_VALUE.has(step.do) && step.value == null) {
      issues.push(err(file, `Action "${step.do}" requires a "value"`, field));
    }
  }

  // Validate `expect`
  if (step.expect != null) {
    if (!VALID_ASSERTIONS.has(step.expect)) {
      issues.push(err(file, `Invalid assertion "${step.expect}". Must be one of: ${[...VALID_ASSERTIONS].join(', ')}`, field + '.expect'));
    }
    if (ASSERTIONS_REQUIRING_VALUE.has(step.expect) && step.value == null) {
      issues.push(err(file, `Assertion "${step.expect}" requires a "value"`, field));
    }
  }

  // Validate `on` references an element key
  if (step.on != null && !elementKeys.has(step.on)) {
    issues.push(err(file, `"on" references unknown element "${step.on}"`, field));
  }

  // Ban +919 phone numbers in test values (real Indian mobiles)
  if (step.value != null && typeof step.value === 'string' && /(?:^|\+91)9\d{9}$/.test(step.value)) {
    issues.push(err(file, `Banned phone number "${step.value}" — +919XXXXXXXXX are real Indian mobile numbers. Use +91000 range for tests.`, field));
  }

  // Enforce e2e naming conventions on entity-creation fill values
  if (step.do === 'fill' && step.on != null && step.value != null && typeof step.value === 'string') {
    const rule = E2E_FILL_PREFIX_RULES.get(step.on);
    if (rule && !step.value.startsWith(rule.prefix)) {
      issues.push(err(file, `${rule.label} fill value "${step.value}" must start with "${rule.prefix}" — see e2e-testing-standards.md naming conventions`, field));
    }
  }

  return issues;
}

// ── Flow validation ─────────────────────────────────────────────────────

function validateFlows(
  file: string,
  flows: TestFlow[],
  elementKeys: Set<string>,
): ValidationError[] {
  const issues: ValidationError[] = [];

  const flowNames = new Set<string>();
  const duplicates = new Set<string>();

  for (const flow of flows) {
    // Name is required and must be a string
    if (typeof flow.name !== 'string' || flow.name.length === 0) {
      issues.push(err(file, `Flow must have a non-empty "name" string`, 'flows'));
      continue;
    }

    // Check for duplicate flow names
    if (flowNames.has(flow.name)) {
      if (!duplicates.has(flow.name)) {
        issues.push(err(file, `Duplicate flow name "${flow.name}"`, 'flows'));
        duplicates.add(flow.name);
      }
    } else {
      flowNames.add(flow.name);
    }

    // Steps must be a non-empty array
    if (!Array.isArray(flow.steps) || flow.steps.length === 0) {
      issues.push(err(file, `Flow "${flow.name}" must have a non-empty "steps" array`, `flows["${flow.name}"]`));
      continue;
    }

    // Validate each step
    for (let i = 0; i < flow.steps.length; i++) {
      issues.push(...validateStep(file, flow.name, i, flow.steps[i], elementKeys));
    }
  }

  // Validate `after` references (supports string or string[])
  for (const flow of flows) {
    if (flow.after != null) {
      const parents = Array.isArray(flow.after) ? flow.after : [flow.after];
      for (const parent of parents) {
        if (typeof parent !== 'string') {
          issues.push(err(file, `Flow "${flow.name}" has non-string "after" entry`, `flows["${flow.name}"].after`));
        } else if (!flowNames.has(parent)) {
          issues.push(err(file, `Flow "${flow.name}" references unknown "after" flow "${parent}"`, `flows["${flow.name}"].after`));
        }
      }
    }
  }

  // Detect circular `after` dependencies using DFS
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const afterMap = new Map<string, string[]>();

  for (const flow of flows) {
    if (flow.after != null) {
      const parents = Array.isArray(flow.after) ? flow.after : [flow.after];
      afterMap.set(flow.name, parents.filter(p => flowNames.has(p)));
    }
  }

  function hasCycle(name: string): boolean {
    if (visiting.has(name)) return true;
    if (visited.has(name)) return false;

    visiting.add(name);
    for (const dep of afterMap.get(name) || []) {
      if (hasCycle(dep)) return true;
    }
    visiting.delete(name);
    visited.add(name);
    return false;
  }

  for (const name of flowNames) {
    if (!visited.has(name) && hasCycle(name)) {
      issues.push(err(file, `Circular "after" dependency detected involving flow "${name}"`, 'flows'));
    }
  }

  return issues;
}

// ── Production data safety ──────────────────────────────────────────────
// Any flow that clicks an edit/delete/toggle button on a table row MUST
// have a preceding search/fill step that filters the table to e2e entities.
// This prevents tests from accidentally modifying production data.

// Element keys that represent row-level entity mutations (edit/delete/toggle on a specific record).
// Excludes UI-level toggles (theme, collapse, filter, audit display options, past/upcoming tabs).
const MUTATING_ELEMENT_PATTERNS = /Edit|Delete|Restore|ActiveToggle|PublicToggle|VerifiedToggle/;
const SAFE_TOGGLE_PATTERNS = /theme|collapse|filter|past|upcoming|show|hide|sort|audit|section/i;
const SEARCH_ELEMENT_PATTERNS = /search|filter/i;

function isMutatingClick(step: TestStep, elementKey: string): boolean {
  if (step.do !== 'click' && step.do !== 'jsClick') return false;
  if (!MUTATING_ELEMENT_PATTERNS.test(elementKey)) return false;
  if (SAFE_TOGGLE_PATTERNS.test(elementKey)) return false;
  return true;
}

function isSearchFill(step: TestStep, elementKey: string): boolean {
  if (step.do !== 'fill' && step.do !== 'reactFill' && step.do !== 'type') return false;
  return SEARCH_ELEMENT_PATTERNS.test(elementKey);
}

function validateProductionDataSafety(
  file: string,
  flows: TestFlow[],
  elements: Record<string, ElementLocator>,
): ValidationError[] {
  const issues: ValidationError[] = [];

  const flowMap = new Map(flows.map(f => [f.name, f]));

  function collectStepsInOrder(flow: TestFlow, visited = new Set<string>()): TestStep[] {
    if (visited.has(flow.name)) return [];
    visited.add(flow.name);
    const steps: TestStep[] = [];
    if (flow.after) {
      const parents = Array.isArray(flow.after) ? flow.after : [flow.after];
      for (const p of parents) {
        const parent = flowMap.get(p);
        if (parent) steps.push(...collectStepsInOrder(parent, visited));
      }
    }
    steps.push(...flow.steps);
    return steps;
  }

  for (const flow of flows) {
    const allSteps = collectStepsInOrder(flow);
    let hasSearchBeforeMutation = false;

    for (const step of allSteps) {
      const elementKey = step.on || '';

      if (isSearchFill(step, elementKey)) {
        hasSearchBeforeMutation = true;
      }

      if (isMutatingClick(step, elementKey) && !hasSearchBeforeMutation) {
        issues.push(err(
          file,
          `Flow "${flow.name}" clicks mutating element "${elementKey}" without a preceding search/filter step. ` +
          `Tests MUST search for e2e-created entities before edit/delete/toggle to avoid modifying production data.`,
          `flows["${flow.name}"]`,
        ));
        break;
      }
    }
  }

  return issues;
}

// ── Spec validation ─────────────────────────────────────────────────────

function validateSpec(file: string, spec: TestSpec): ValidationError[] {
  const issues: ValidationError[] = [];

  // route
  if (typeof spec.route !== 'string' || spec.route.length === 0) {
    issues.push(err(file, `"route" must be a non-empty string`, 'route'));
  } else if (!spec.seedApi) {
    const segments = spec.route.split('/').filter(Boolean);
    const pageFile = file.replace(/\\/g, '/');
    const hasDynamic = pageFile.includes('/[');
    if (hasDynamic) {
      const lastSeg = segments[segments.length - 1];
      if (lastSeg && !lastSeg.startsWith('e2e') && !lastSeg.startsWith('[')) {
        issues.push(err(file, `Route "${spec.route}" has a dynamic segment but uses "${lastSeg}" instead of an e2e-prefixed value. Use e2e_ accounts for test routes.`, 'route'));
      }
    }
  }

  // auth
  if (!VALID_AUTH_PRESETS.has(spec.auth)) {
    issues.push(err(file, `Invalid auth preset "${spec.auth}". Must be one of: ${[...VALID_AUTH_PRESETS].join(', ')}`, 'auth'));
  }

  // app
  if (!VALID_APP_NAMES.has(spec.app)) {
    issues.push(err(file, `Invalid app name "${spec.app}". Must be one of: ${[...VALID_APP_NAMES].join(', ')}`, 'app'));
  }

  // title
  if (typeof spec.title !== 'string' || spec.title.length === 0) {
    issues.push(err(file, `"title" must be a non-empty string`, 'title'));
  }

  // elements
  if (spec.elements == null || typeof spec.elements !== 'object') {
    issues.push(err(file, `"elements" must be an object`, 'elements'));
  } else if (Object.keys(spec.elements).length > 0) {
    for (const [key, locator] of Object.entries(spec.elements)) {
      issues.push(...validateLocator(file, key, locator as Record<string, unknown>));
    }
  }

  // flows
  if (!Array.isArray(spec.flows)) {
    issues.push(err(file, `"flows" must be an array`, 'flows'));
  } else if (spec.flows.length > 0) {
    const elementKeys = new Set(Object.keys(spec.elements ?? {}));
    issues.push(...validateFlows(file, spec.flows, elementKeys));
  }

  // Production data safety: check all flows (flat + flowTree) for unguarded mutations
  const allFlows = spec.flowTree
    ? [...(spec.flows || []), ...flattenTreeToPaths(spec.flowTree)]
    : (spec.flows || []);
  if (allFlows.length > 0) {
    issues.push(...validateProductionDataSafety(file, allFlows, spec.elements ?? {}));
  }

  return issues;
}

// ── Component spec validation ───────────────────────────────────────────

function validateComponentSpec(file: string, spec: ComponentTestSpec): ValidationError[] {
  const issues: ValidationError[] = [];

  // parentRoute: must be non-empty string or non-empty array of strings
  if (Array.isArray(spec.parentRoute)) {
    if (spec.parentRoute.length === 0) {
      issues.push(err(file, `"parentRoute" array must not be empty`, 'parentRoute'));
    } else {
      for (let i = 0; i < spec.parentRoute.length; i++) {
        if (typeof spec.parentRoute[i] !== 'string' || spec.parentRoute[i].length === 0) {
          issues.push(err(file, `"parentRoute[${i}]" must be a non-empty string`, 'parentRoute'));
        }
      }
    }
  } else if (typeof spec.parentRoute !== 'string' || spec.parentRoute.length === 0) {
    issues.push(err(file, `"parentRoute" must be a non-empty string or non-empty array of strings`, 'parentRoute'));
  }

  // app
  if (!VALID_APP_NAMES.has(spec.app)) {
    issues.push(err(file, `Invalid app name "${spec.app}". Must be one of: ${[...VALID_APP_NAMES].join(', ')}`, 'app'));
  }

  // title
  if (typeof spec.title !== 'string' || spec.title.length === 0) {
    issues.push(err(file, `"title" must be a non-empty string`, 'title'));
  }

  // elements
  if (spec.elements == null || typeof spec.elements !== 'object') {
    issues.push(err(file, `"elements" must be an object`, 'elements'));
  } else if (Object.keys(spec.elements).length > 0) {
    for (const [key, locator] of Object.entries(spec.elements)) {
      issues.push(...validateLocator(file, key, locator as Record<string, unknown>));
    }
  }

  // flows
  if (!Array.isArray(spec.flows)) {
    issues.push(err(file, `"flows" must be an array`, 'flows'));
  } else if (spec.flows.length > 0) {
    const elementKeys = new Set(Object.keys(spec.elements ?? {}));
    issues.push(...validateFlows(file, spec.flows, elementKeys));
  }

  return issues;
}

// ── Parent route cross-reference ────────────────────────────────────────

function crossReferenceParentRoutes(
  componentSpecs: ScannedComponentSpec[],
  pageSpecs: ScannedSpec[],
): ValidationError[] {
  const issues: ValidationError[] = [];

  // Build a map of app -> set of routes from page specs
  const pageRoutesByApp = new Map<string, Set<string>>();
  for (const page of pageSpecs) {
    if (!pageRoutesByApp.has(page.app)) {
      pageRoutesByApp.set(page.app, new Set());
    }
    pageRoutesByApp.get(page.app)!.add(page.spec.route);
  }

  for (const comp of componentSpecs) {
    const appRoutes = pageRoutesByApp.get(comp.app) ?? new Set();
    for (const route of comp.parentRoutes) {
      // Match dynamic route segments: treat the last segment as a dynamic param
      // e.g., /consultation/test-id matches /consultation/0 (both are /consultation/[id])
      const routePrefix = route.split('/').slice(0, -1).join('/');
      const matches = [...appRoutes].some(pageRoute => {
        if (pageRoute === route) return true;
        const pagePrefix = pageRoute.split('/').slice(0, -1).join('/');
        return routePrefix === pagePrefix && routePrefix.length > 0;
      });
      if (!matches) {
        issues.push(err(
          comp.filePath,
          `parentRoute '${route}' does not match any page spec in app '${comp.app}'`,
          'parentRoute',
        ));
      }
    }
  }

  return issues;
}

// ── JSX cross-validation helper ─────────────────────────────────────────

function jsxCrossValidate(
  file: string,
  elements: Record<string, ElementLocator>,
  precomputedAudit?: JsxAudit,
): ValidationError[] {
  const issues: ValidationError[] = [];
  const audit = precomputedAudit ?? auditJsx(file);
  const jsxIssues = crossValidateElements(elements, audit);

  for (const issue of jsxIssues) {
    const field = `elements.${issue.element}`;
    if (issue.severity === 'error') {
      issues.push(err(file, issue.message, field));
    } else {
      issues.push(warn(file, issue.message, field));
    }
  }

  return issues;
}

// ── Action-path coverage auditor ───────────────────────────────────────

type InteractionType = 'button' | 'input' | 'select' | 'checkbox' | 'toggle' | 'link' | 'display';

const ROLE_TO_INTERACTION: Record<string, InteractionType> = {
  button: 'button', link: 'link', textbox: 'input', checkbox: 'checkbox',
  radio: 'checkbox', combobox: 'select', switch: 'toggle', slider: 'input',
  spinbutton: 'input', tab: 'button', menuitem: 'button',
};

const REQUIRED_ACTIONS: Record<InteractionType, string[]> = {
  button: ['click'],
  input: ['fill'],
  select: ['select'],
  checkbox: ['click'],
  toggle: ['click'],
  link: ['click'],
  display: ['visible'],
};

function classifyElement(key: string, locator: ElementLocator): InteractionType {
  if ('role' in locator) return ROLE_TO_INTERACTION[locator.role] || 'display';
  if ('testId' in locator) {
    const id = locator.testId.toLowerCase();
    const k = key.toLowerCase();
    if (id.includes('error') || id.includes('success') || id.includes('message') || id.includes('warning')
      || id.includes('badge') || id.includes('count') || id.includes('heading') || id.includes('title')
      || id.includes('label') || id.includes('display') || id.includes('overlay') || id.includes('table')
      || id.includes('chart') || id.includes('grid') || id.includes('card') || id.includes('row')
      || id.includes('bar') || id.includes('icon') || id.includes('loading') || id.includes('empty')
      || id.includes('skeleton') || id.includes('result') || id.includes('temp-password')
      || id.includes('sort-')) return 'display';
    if (id.includes('btn') || id.includes('button') || id.includes('submit') || id.includes('toggle') || id.includes('refresh')) return 'button';
    if (k.includes('btn') || k.includes('button') || k.includes('submit') || k.includes('toggle')
      || k.includes('sort') || k.includes('tab')) return 'button';
    if (id.includes('input') || id.includes('search') || id.includes('fee') || id.includes('amount')) return 'input';
    if (id.includes('select') || id.includes('filter') || id.includes('combobox')) return 'select';
    if (id.includes('checkbox') || id.includes('check')) return 'checkbox';
  }
  return 'display';
}

function auditActionPaths(
  file: string,
  elements: Record<string, ElementLocator>,
  flows: TestFlow[],
): ValidationError[] {
  const issues: ValidationError[] = [];
  const testedActions = new Map<string, Set<string>>();

  for (const [key] of Object.entries(elements)) {
    testedActions.set(key, new Set());
  }

  const flowMap = new Map(flows.map(f => [f.name, f]));
  function collectAllSteps(flow: TestFlow, visited = new Set<string>()): TestStep[] {
    if (visited.has(flow.name)) return [];
    visited.add(flow.name);
    const steps: TestStep[] = [];
    if (flow.after) {
      const parents = Array.isArray(flow.after) ? flow.after : [flow.after];
      for (const p of parents) {
        const parent = flowMap.get(p);
        if (parent) steps.push(...collectAllSteps(parent, visited));
      }
    }
    steps.push(...flow.steps);
    return steps;
  }

  for (const flow of flows) {
    for (const step of collectAllSteps(flow)) {
      if (!step.on) continue;
      const actions = testedActions.get(step.on);
      if (!actions) continue;
      if (step.do) {
        actions.add(step.do);
        if (step.do === 'waitFor') actions.add('assert:visible');
      }
      if (step.expect) actions.add(`assert:${step.expect}`);
    }
  }

  for (const [key, locator] of Object.entries(elements)) {
    const type = classifyElement(key, locator);
    const tested = testedActions.get(key) || new Set();
    const required = REQUIRED_ACTIONS[type] || [];

    const fillLike = new Set(['fill', 'type', 'reactFill', 'fillFromSlotDay']);
    const clickLike = new Set(['click', 'jsClick', 'comboboxSelect', 'comboboxSelectFirst']);
    const selectLike = new Set(['select', 'comboboxSelect', 'comboboxSelectFirst']);

    function hasActionType(action: string): boolean {
      if (tested.has(action)) return true;
      if (action === 'fill') return [...tested].some(t => fillLike.has(t));
      if (action === 'click') return [...tested].some(t => clickLike.has(t) || t === 'clickNewTab');
      if (action === 'select') return [...tested].some(t => selectLike.has(t));
      if (action === 'visible') {
        return [...tested].some(t =>
          t.startsWith('assert:') || clickLike.has(t) || fillLike.has(t)
          || selectLike.has(t) || t === 'waitFor' || t === 'clickNewTab'
          || t === 'check' || t === 'hover' || t === 'press'
        );
      }
      return false;
    }

    const isDisabledOrReadonly = [...tested].some(t => t === 'assert:disabled' || t === 'assert:value');
    if (type === 'input' && isDisabledOrReadonly) continue;

    if (tested.size === 0) {
      issues.push(warn(file, `Element "${key}" (${type}) defined but never used in any flow`, `elements.${key}`));
    } else {
      for (const action of required) {
        if (!hasActionType(action)) {
          issues.push(warn(file, `Element "${key}" (${type}) missing "${action}" action — has: ${[...tested].join(', ')}`, `elements.${key}`));
        }
      }
    }
  }

  return issues;
}

// ── Main entry point ────────────────────────────────────────────────────

export async function validateSpecs(rootDir: string): Promise<ValidationResult> {
  // 1. Find all page.tsx files
  const pattern = 'apps/*/app/**/page.tsx';
  const allPageFiles = await glob(pattern, { cwd: rootDir, absolute: true });
  const totalFiles = allPageFiles.length;

  // 2. Scan page specs
  const scannedSpecs = await scanSpecs(rootDir);
  const filesWithSpecs = scannedSpecs.length;

  // 3. Scan component specs
  const scannedComponentSpecs = await scanComponentSpecs(rootDir);
  const componentsWithSpecs = scannedComponentSpecs.length;

  // 4. Scan all component files for coverage
  const allComponentFiles = await scanAllComponentFiles(rootDir);
  const totalComponentFiles = allComponentFiles.length;

  // Build sets for coverage checking
  const pageSpecFilePaths = new Set(scannedSpecs.map(s => s.filePath));
  const componentSpecFilePaths = new Set(scannedComponentSpecs.map(s => s.filePath));

  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Page coverage check: find page files without specs
  for (const filePath of allPageFiles) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (!pageSpecFilePaths.has(normalizedPath)) {
      warnings.push(warn(normalizedPath, `No __test export found`));
    }
  }

  // 5. Build aggregated JSX audits per page route
  // For each page, we audit the page file + all component files that target that route
  // + shared UI components from packages/ui/.
  const pageAuditCache = new Map<string, JsxAudit>();
  const componentsByPageKey = new Map<string, ScannedComponentSpec[]>();

  // Pre-scan shared UI components (Toast, ConfirmModal, ToggleSwitch, etc.)
  const sharedUiFiles = await glob('packages/ui/*.tsx', { cwd: rootDir, absolute: true });
  const sharedUiAudit = mergeAudits(sharedUiFiles.map(f => auditJsx(f)));

  function normalizeRouteKey(app: string, route: string): string {
    return `${app}:${route.replace(/\/\[[^\]]+\]/g, '/*').replace(/\/[^/]+$/, (seg) => /^\/[a-z]+(-[a-z]+)*$/i.test(seg) && !/\d/.test(seg) && !seg.includes('test-') ? seg : '/*')}`;
  }

  for (const comp of scannedComponentSpecs) {
    for (const route of comp.parentRoutes) {
      const key = normalizeRouteKey(comp.app, route);
      if (!componentsByPageKey.has(key)) componentsByPageKey.set(key, []);
      componentsByPageKey.get(key)!.push(comp);
    }
  }

  for (const page of scannedSpecs) {
    const key = normalizeRouteKey(page.app, page.route);
    const audits: JsxAudit[] = [sharedUiAudit, auditJsx(page.filePath)];
    const comps = componentsByPageKey.get(key) ?? [];
    for (const comp of comps) {
      audits.push(auditJsx(comp.filePath));
    }
    pageAuditCache.set(key, mergeAudits(audits));
  }

  // 6. Validate each page spec (existing + JSX cross-validation with aggregated audit)
  for (const scanned of scannedSpecs) {
    const issues = validateSpec(scanned.filePath, scanned.spec);
    for (const issue of issues) {
      if (issue.severity === 'error') {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }

    const nkey = normalizeRouteKey(scanned.app, scanned.route);
    const aggregatedAudit = pageAuditCache.get(nkey);
    const jsxIssues = jsxCrossValidate(scanned.filePath, scanned.spec.elements, aggregatedAudit);
    for (const issue of jsxIssues) {
      if (issue.severity === 'error') {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }
  }

  // 7. Validate each component spec (with aggregated page audit)
  for (const scanned of scannedComponentSpecs) {
    const issues = validateComponentSpec(scanned.filePath, scanned.spec);
    for (const issue of issues) {
      if (issue.severity === 'error') {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }

    const compKey = normalizeRouteKey(scanned.app, scanned.parentRoutes[0]);
    const aggregatedAudit = pageAuditCache.get(compKey);
    const jsxIssues = jsxCrossValidate(scanned.filePath, scanned.spec.elements, aggregatedAudit);
    for (const issue of jsxIssues) {
      if (issue.severity === 'error') {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }
  }

  // 8. Cross-reference parentRoutes against page specs
  const parentRouteIssues = crossReferenceParentRoutes(scannedComponentSpecs, scannedSpecs);
  for (const issue of parentRouteIssues) {
    if (issue.severity === 'error') {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  // 9. Action-path coverage audit
  for (const scanned of scannedSpecs) {
    const allFlows = scanned.spec.flowTree
      ? [...scanned.spec.flows, ...flattenTreeToPaths(scanned.spec.flowTree)]
      : scanned.spec.flows;
    const actionIssues = auditActionPaths(scanned.filePath, scanned.spec.elements, allFlows);
    for (const issue of actionIssues) {
      warnings.push(issue);
    }
  }

  // 10. Component coverage check: find component files missing specs
  const componentsMissingSpecs = totalComponentFiles - componentsWithSpecs;
  for (const filePath of allComponentFiles) {
    if (!componentSpecFilePaths.has(filePath)) {
      warnings.push(warn(filePath, `No __test component spec found`));
    }
  }

  return {
    totalFiles,
    filesWithSpecs,
    filesMissingSpecs: totalFiles - filesWithSpecs,
    totalComponentFiles,
    componentsWithSpecs,
    componentsMissingSpecs,
    errors,
    warnings,
  };
}
