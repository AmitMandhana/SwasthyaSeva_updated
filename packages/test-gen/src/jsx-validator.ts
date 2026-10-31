import * as ts from 'typescript';
import type { ElementLocator } from './index.js';

export interface JsxAudit {
  testIds: Set<string>;
  testIdPrefixes: Set<string>;
  ariaLabels: Set<string>;
  buttonTexts: Set<string>;
  roles: Set<string>;
  inputNames: Set<string>;
  allStringLiterals: Set<string>;
  interactiveElementCount: number;
}

export function mergeAudits(audits: JsxAudit[]): JsxAudit {
  const merged: JsxAudit = {
    testIds: new Set(),
    testIdPrefixes: new Set(),
    ariaLabels: new Set(),
    buttonTexts: new Set(),
    roles: new Set(),
    inputNames: new Set(),
    allStringLiterals: new Set(),
    interactiveElementCount: 0,
  };
  for (const a of audits) {
    a.testIds.forEach(v => merged.testIds.add(v));
    a.testIdPrefixes.forEach(v => merged.testIdPrefixes.add(v));
    a.ariaLabels.forEach(v => merged.ariaLabels.add(v));
    a.buttonTexts.forEach(v => merged.buttonTexts.add(v));
    a.roles.forEach(v => merged.roles.add(v));
    a.inputNames.forEach(v => merged.inputNames.add(v));
    a.allStringLiterals.forEach(v => merged.allStringLiterals.add(v));
    merged.interactiveElementCount += a.interactiveElementCount;
  }
  return merged;
}

const INTERACTIVE_TAGS = new Set([
  'button', 'Button', 'a', 'Link', 'input', 'textarea', 'select',
  'TextField', 'TextAreaField', 'SelectField', 'Modal', 'ConfirmModal', 'dialog',
  'Checkbox', 'ToggleSwitch', 'TabPillMultiSelect', 'TagMultiSelect',
  'ImageUpload', 'FilterSearchBar',
]);

const BUTTON_LIKE_TAGS = new Set(['button', 'Button', 'a', 'Link']);

const TEXT_BEARING_TAGS = new Set([
  'button', 'Button', 'a', 'Link', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'label', 'span', 'p', 'td', 'th', 'li', 'option', 'Badge',
]);

const LABEL_PROP_TAGS = new Set([
  'TextField', 'TextAreaField', 'SelectField', 'FilterSearchBar',
  'TabPillMultiSelect', 'TagMultiSelect', 'Checkbox', 'ToggleSwitch',
]);

const LABEL_LIKE_PROPS = new Set([
  'label', 'placeholder', 'title', 'heading', 'confirmLabel', 'cancelLabel',
  'name', 'aria-label',
]);

const EVENT_HANDLER_ATTRS = new Set(['onClick', 'onChange', 'onSubmit', 'onBlur']);

/**
 * Extract a string value from a JSX attribute initializer.
 * Handles both plain string literals and JSX expressions wrapping string literals.
 */
function extractStringValue(initializer: ts.JsxAttributeValue | undefined): string | undefined {
  if (!initializer) return undefined;

  if (ts.isStringLiteral(initializer)) {
    return initializer.text;
  }

  if (ts.isJsxExpression(initializer) && initializer.expression) {
    if (ts.isStringLiteral(initializer.expression)) {
      return initializer.expression.text;
    }
  }

  return undefined;
}

function extractTemplatePrefixes(initializer: ts.JsxAttributeValue | undefined): string[] {
  if (!initializer) return [];
  if (!ts.isJsxExpression(initializer) || !initializer.expression) return [];
  const expr = initializer.expression;
  if (!ts.isTemplateExpression(expr)) return [];
  const head = expr.head.text;
  if (!head) return [];
  return [head];
}

function extractAllStringValues(initializer: ts.JsxAttributeValue | undefined): string[] {
  if (!initializer) return [];

  if (ts.isStringLiteral(initializer)) {
    return [initializer.text];
  }

  if (ts.isJsxExpression(initializer) && initializer.expression) {
    return extractStringsFromExpression(initializer.expression);
  }

  return [];
}

/**
 * Recursively extract string values from an expression (handles ternaries, string literals).
 */
function extractStringsFromExpression(expr: ts.Expression): string[] {
  const results: string[] = [];
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    const trimmed = expr.text.trim();
    if (trimmed) results.push(trimmed);
  } else if (ts.isConditionalExpression(expr)) {
    results.push(...extractStringsFromExpression(expr.whenTrue));
    results.push(...extractStringsFromExpression(expr.whenFalse));
  } else if (ts.isTemplateExpression(expr)) {
    const head = expr.head.text.trim();
    if (head) results.push(head);
  } else if (ts.isParenthesizedExpression(expr)) {
    results.push(...extractStringsFromExpression(expr.expression));
  } else if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    results.push(...extractStringsFromExpression(expr.left as ts.Expression));
    results.push(...extractStringsFromExpression(expr.right as ts.Expression));
  }
  return results;
}

/**
 * Extract text content from JSX children.
 * Handles JsxText, JsxExpression with string literals, and ternaries.
 */
function extractButtonText(node: ts.JsxElement): string[] {
  const texts: string[] = [];
  for (const child of node.children) {
    if (ts.isJsxText(child)) {
      const trimmed = child.text.trim();
      if (trimmed.length > 0) {
        texts.push(trimmed);
      }
    } else if (ts.isJsxExpression(child) && child.expression) {
      texts.push(...extractStringsFromExpression(child.expression));
    }
  }
  return texts;
}

/**
 * Get the tag name from a JSX opening or self-closing element.
 */
function getTagName(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): string {
  if (ts.isIdentifier(node.tagName)) {
    return node.tagName.text;
  }
  if (ts.isPropertyAccessExpression(node.tagName)) {
    return node.tagName.getText();
  }
  return node.tagName.getText();
}

/**
 * Parse a TSX file and audit its JSX for interactive elements and locator-relevant attributes.
 */
export function auditJsx(filePath: string): JsxAudit {
  const sourceText = ts.sys.readFile(filePath);
  if (!sourceText) {
    return {
      testIds: new Set(),
      testIdPrefixes: new Set(),
      ariaLabels: new Set(),
      buttonTexts: new Set(),
      roles: new Set(),
      inputNames: new Set(),
      allStringLiterals: new Set(),
      interactiveElementCount: 0,
    };
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const audit: JsxAudit = {
    testIds: new Set(),
    testIdPrefixes: new Set(),
    ariaLabels: new Set(),
    buttonTexts: new Set(),
    roles: new Set(),
    inputNames: new Set(),
    allStringLiterals: new Set(),
    interactiveElementCount: 0,
  };

  function collectAllStrings(node: ts.Node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const trimmed = node.text.trim();
      if (trimmed.length > 1) {
        audit.allStringLiterals.add(trimmed);
        if (trimmed.length < 50 && /^[a-z]/.test(trimmed)) {
          audit.allStringLiterals.add(trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
        }
      }
    }
    ts.forEachChild(node, collectAllStrings);
  }
  collectAllStrings(sourceFile);

  function visit(node: ts.Node) {
    // Check JSX attributes
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const attrName = node.name.text;

      if (attrName === 'data-testid') {
        const value = extractStringValue(node.initializer);
        if (value) {
          audit.testIds.add(value);
        } else {
          for (const prefix of extractTemplatePrefixes(node.initializer)) {
            audit.testIdPrefixes.add(prefix);
          }
        }
      }

      if (attrName === 'aria-label') {
        const value = extractStringValue(node.initializer);
        if (value) {
          audit.ariaLabels.add(value);
        }
      }

      if (attrName === 'role') {
        const value = extractStringValue(node.initializer);
        if (value) {
          audit.roles.add(value);
        }
      }

      if (attrName === 'name') {
        const value = extractStringValue(node.initializer);
        if (value) {
          audit.inputNames.add(value);
        }
      }

      if (EVENT_HANDLER_ATTRS.has(attrName)) {
        audit.interactiveElementCount++;
      }
    }

    // Check JSX opening/self-closing elements
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = getTagName(node);

      if (INTERACTIVE_TAGS.has(tagName)) {
        audit.interactiveElementCount++;
      }

      // Extract label-like props (label, placeholder, title, confirmLabel, etc.)
      if (node.attributes) {
        for (const attr of node.attributes.properties) {
          if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name)) {
            if (LABEL_LIKE_PROPS.has(attr.name.text)) {
              const vals = extractAllStringValues(attr.initializer);
              for (const val of vals) {
                audit.buttonTexts.add(val);
                audit.ariaLabels.add(val);
              }
            }
          }
        }
      }

      // Extract text children from text-bearing elements
      if (TEXT_BEARING_TAGS.has(tagName) && ts.isJsxOpeningElement(node)) {
        const parent = node.parent;
        if (ts.isJsxElement(parent)) {
          const texts = extractButtonText(parent);
          for (const text of texts) {
            audit.buttonTexts.add(text);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return audit;
}

// ── Cross-validation ────────────────────────────────────────────────────

export interface CrossValidationIssue {
  element: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Cross-validate declared element locators against the JSX audit results.
 * Checks that referenced testIds, button texts, aria labels, etc. actually
 * exist in the component's JSX.
 */
export function crossValidateElements(
  elements: Record<string, ElementLocator>,
  audit: JsxAudit,
): CrossValidationIssue[] {
  const issues: CrossValidationIssue[] = [];

  for (const [name, locator] of Object.entries(elements)) {
    if ('testId' in locator) {
      const exactMatch = audit.testIds.has(locator.testId);
      const prefixMatch = !exactMatch && [...audit.testIdPrefixes].some(p => locator.testId.startsWith(p));
      if (!exactMatch && !prefixMatch) {
        issues.push({
          element: name,
          message: `data-testid="${locator.testId}" not found in JSX (may be in imported component)`,
          severity: 'warning',
        });
      }
    } else if ('role' in locator) {
      const locatorName = locator.name;
      if (typeof locatorName === 'string') {
        const found = audit.buttonTexts.has(locatorName)
          || audit.ariaLabels.has(locatorName)
          || audit.allStringLiterals.has(locatorName);
        if (!found) {
          issues.push({
            element: name,
            message: `Role locator name "${locatorName}" not found in button texts, aria-labels, or string literals`,
            severity: 'warning',
          });
        }
      }
    } else if ('text' in locator && !('css' in locator)) {
      const locatorText = locator.text;
      if (typeof locatorText === 'string') {
        const found = audit.buttonTexts.has(locatorText)
          || audit.ariaLabels.has(locatorText)
          || audit.testIds.has(locatorText)
          || audit.allStringLiterals.has(locatorText);
        if (!found) {
          issues.push({
            element: name,
            message: `Text "${locatorText}" not found in JSX or string literals`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return issues;
}
