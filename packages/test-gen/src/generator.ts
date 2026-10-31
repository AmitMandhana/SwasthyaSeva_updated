#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { scanSpecs, scanComponentSpecs } from './scanner.js';
import type { ScannedComponentSpec } from './scanner.js';
import { resolveFlowOrder, flattenTreeToPaths } from './resolver.js';
import { generateTestFile, generateMergedTestFile } from './templates.js';
import { validateSpecs } from './validator.js';
import { analyze } from './analyzer.js';

/**
 * Compute the output path for a given scanned spec.
 *
 * Mapping:
 *   apps/web/app/slot-search/page.tsx  -> e2e/generated/web/slot-search.spec.ts
 *   apps/web/app/page.tsx              -> e2e/generated/web/home.spec.ts
 *   apps/admin/app/dashboard/page.tsx  -> e2e/generated/admin/dashboard.spec.ts
 *   apps/doctor/app/dashboard/consultation/[id]/page.tsx
 *                                      -> e2e/generated/doctor/dashboard-consultation-id.spec.ts
 */
function computeOutputPath(rootDir: string, app: string, route: string): string {
  let slug: string;

  if (route === '/') {
    slug = 'home';
  } else {
    // Remove leading slash, replace [param] with param (strip brackets)
    slug = route
      .slice(1)
      .replace(/\[([^\]]+)\]/g, '$1')
      .replace(/\//g, '-');
  }

  return path.join(rootDir, 'e2e', 'generated', app, `${slug}.spec.ts`);
}


async function runGenerate(rootDir: string): Promise<void> {
  console.log(`Scanning for test specs in: ${rootDir}`);

  // Step 1: Scan for page specs and component specs
  const specs = await scanSpecs(rootDir);
  const componentSpecs = await scanComponentSpecs(rootDir);
  console.log(`Found ${specs.length} test spec(s), ${componentSpecs.length} component spec(s)`);

  if (specs.length === 0) {
    console.log('No test specs found. Nothing to generate.');
    return;
  }

  // Step 2: Build component spec map keyed by "app:parentRoute"
  const componentMap = new Map<string, ScannedComponentSpec[]>();
  for (const comp of componentSpecs) {
    for (const parentRoute of comp.parentRoutes) {
      const key = `${comp.app}:${parentRoute}`;
      if (!componentMap.has(key)) {
        componentMap.set(key, []);
      }
      componentMap.get(key)!.push(comp);
    }
  }

  let generated = 0;
  let skipped = 0;

  // Step 3: Process each spec
  for (const scanned of specs) {
    const outputPath = computeOutputPath(rootDir, scanned.app, scanned.route);

    // If flowTree exists, flatten it into flows
    if (scanned.spec.flowTree) {
      const treeFlows = flattenTreeToPaths(scanned.spec.flowTree);
      scanned.spec.flows = [...scanned.spec.flows, ...treeFlows];
    }

    // Resolve flow order (validates dependencies, detects cycles)
    try {
      resolveFlowOrder(scanned.spec.flows);
    } catch (err) {
      console.error(`Error resolving flows for ${scanned.filePath}: ${(err as Error).message}`);
      continue;
    }

    // Look up matching component specs
    const key = `${scanned.app}:${scanned.route}`;
    const matchingComponents = componentMap.get(key) ?? [];

    // Validate component flow order
    let componentError = false;
    for (const comp of matchingComponents) {
      try {
        resolveFlowOrder(comp.spec.flows);
      } catch (err) {
        console.error(`Error resolving flows for component ${comp.filePath}: ${(err as Error).message}`);
        componentError = true;
      }
    }
    if (componentError) continue;

    // Generate test file content
    const content = matchingComponents.length > 0
      ? generateMergedTestFile(scanned, matchingComponents)
      : generateTestFile(scanned);

    // Compare generated content with existing file
    let existingContent: string | null = null;
    try { existingContent = fs.readFileSync(outputPath, 'utf8'); } catch {}
    if (existingContent === content) {
      skipped++;
      continue;
    }

    // Create directory and write file
    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, content, 'utf8');

    generated++;
    console.log(`  Generated: ${path.relative(rootDir, outputPath)}`);
  }

  // Step 4: Report
  console.log('');
  console.log(`Done! Total: ${specs.length}, Generated: ${generated}, Skipped: ${skipped}`);
}

async function runValidate(rootDir: string): Promise<void> {
  console.log(`Validating test specs in: ${rootDir}`);
  console.log('');

  const result = await validateSpecs(rootDir);

  // Group errors and warnings by file
  const issuesByFile = new Map<string, { errors: typeof result.errors; warnings: typeof result.warnings }>();

  for (const error of result.errors) {
    const rel = path.relative(rootDir, error.file);
    if (!issuesByFile.has(rel)) {
      issuesByFile.set(rel, { errors: [], warnings: [] });
    }
    issuesByFile.get(rel)!.errors.push(error);
  }

  for (const warning of result.warnings) {
    const rel = path.relative(rootDir, warning.file);
    if (!issuesByFile.has(rel)) {
      issuesByFile.set(rel, { errors: [], warnings: [] });
    }
    issuesByFile.get(rel)!.warnings.push(warning);
  }

  // Print issues grouped by file
  for (const [file, issues] of [...issuesByFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${file}`);
    for (const error of issues.errors) {
      const fieldStr = error.field ? ` [${error.field}]` : '';
      console.log(`    ERROR${fieldStr}: ${error.message}`);
    }
    for (const warning of issues.warnings) {
      const fieldStr = warning.field ? ` [${warning.field}]` : '';
      console.log(`    WARN${fieldStr}: ${warning.message}`);
    }
    console.log('');
  }

  // Summary
  console.log('─'.repeat(60));
  console.log(`  Page files        : ${result.totalFiles} (${result.filesWithSpecs} with specs, ${result.filesMissingSpecs} missing)`);
  console.log(`  Component files   : ${result.totalComponentFiles} (${result.componentsWithSpecs} with specs, ${result.componentsMissingSpecs} missing)`);
  console.log(`  Errors            : ${result.errors.length}`);
  console.log(`  Warnings          : ${result.warnings.length}`);
  console.log('─'.repeat(60));

  if (result.errors.length > 0) {
    console.log('');
    console.log('Validation failed with errors.');
    process.exit(1);
  } else if (result.warnings.length > 0) {
    console.log('');
    console.log('Validation passed with warnings.');
  } else {
    console.log('');
    console.log('Validation passed. All specs are valid.');
  }
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

async function runAnalyze(rootDir: string): Promise<void> {
  console.log(`Analyzing test coverage in: ${rootDir}`);
  console.log('');

  const result = await analyze(rootDir);

  // Per-app summary table
  console.log('Per-App Summary');
  console.log('─'.repeat(72));
  console.log(
    '  App'.padEnd(14) +
    'Pages'.padStart(7) +
    'Components'.padStart(14) +
    'Annotated'.padStart(12) +
    'Flows'.padStart(8) +
    'Steps'.padStart(8)
  );
  console.log('─'.repeat(72));

  for (const [app, stats] of [...result.perApp.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(
      `  ${app}`.padEnd(14) +
      String(stats.pages).padStart(7) +
      String(stats.components.total).padStart(14) +
      String(stats.components.annotated).padStart(12) +
      String(stats.flows).padStart(8) +
      String(stats.steps).padStart(8)
    );
  }
  console.log('─'.repeat(72));
  console.log('');

  // Overall stats
  console.log('Overall');
  console.log('─'.repeat(48));
  console.log(`  Pages with specs      : ${result.totalPages}`);
  console.log(`  Page flows            : ${result.totalPageFlows}`);
  console.log(`  Page steps            : ${result.totalPageSteps}`);
  console.log(`  Component files       : ${result.totalComponentFiles}`);
  console.log(`  Annotated components  : ${result.annotatedComponents}`);
  console.log(`  Missing components    : ${result.missingComponents.length}`);
  console.log('─'.repeat(48));
  console.log('');

  // Execution time note
  console.log('Execution Time');
  console.log('─'.repeat(48));
  console.log('  Run tests to get real timing.');
  console.log('  npx playwright test --reporter=list');
  console.log('─'.repeat(48));
  console.log('');

  // Projected growth
  console.log('Projected Growth (from missing components)');
  console.log('─'.repeat(48));
  console.log(`  Additional flows      : +${result.projectedAdditionalFlows}`);
  console.log(`  Additional steps      : +${result.projectedAdditionalSteps}`);
  console.log('─'.repeat(48));
  console.log('');

  // Top missing components
  if (result.missingComponents.length > 0) {
    const top = result.missingComponents.slice(0, 15);
    console.log(`Top ${top.length} Missing Components (by interactive elements)`);
    console.log('─'.repeat(72));
    for (const missing of top) {
      const rel = path.relative(rootDir, missing.file);
      console.log(`  ${String(missing.interactiveElements).padStart(3)} elements  ${rel}`);
    }
    if (result.missingComponents.length > 15) {
      console.log(`  ... and ${result.missingComponents.length - 15} more`);
    }
    console.log('─'.repeat(72));
  }
}

async function main(): Promise<void> {
  // Parse command line args
  const args = process.argv.slice(2);
  let rootDir = process.cwd();
  let command = 'generate';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && args[i + 1]) {
      rootDir = path.resolve(args[i + 1]);
      i++;
    } else if (!args[i].startsWith('-')) {
      command = args[i];
    }
  }

  if (command === 'validate') {
    await runValidate(rootDir);
    return;
  }

  if (command === 'analyze') {
    await runAnalyze(rootDir);
    return;
  }

  if (command !== 'generate') {
    console.error(`Unknown command: ${command}`);
    console.error('Usage: test-gen <generate|validate|analyze> [--root <dir>]');
    process.exit(1);
  }

  await runGenerate(rootDir);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
