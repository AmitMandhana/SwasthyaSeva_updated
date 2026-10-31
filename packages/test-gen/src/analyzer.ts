import { scanSpecs, scanComponentSpecs, scanAllComponentFiles } from './scanner.js';
import { auditJsx } from './jsx-validator.js';
import type { TestStep } from './index.js';

export interface AnalysisResult {
  perApp: Map<string, AppAnalysis>;
  totalPages: number;
  totalPageFlows: number;
  totalPageSteps: number;
  totalComponentFiles: number;
  annotatedComponents: number;
  missingComponents: Array<{ file: string; interactiveElements: number }>;
  projectedAdditionalFlows: number;
  projectedAdditionalSteps: number;
  currentExecutionTime: { sequential: number; parallel: number };
  projectedExecutionTime: { sequential: number; parallel: number };
}

interface AppAnalysis {
  pages: number;
  components: { total: number; annotated: number };
  flows: number;
  steps: number;
}

// ── Timing model ────────────────────────────────────────────────────────

const ACTION_TIMING: Record<string, number> = {
  navigate: 2.0,
  waitFor: 1.0,
  click: 0.3,
  fill: 0.3,
  select: 0.3,
  check: 0.3,
  hover: 0.3,
  press: 0.3,
  screenshot: 0.5,
};

const ASSERTION_TIMING = 0.2;
const PER_TEST_OVERHEAD = 2.0;

/**
 * Estimate execution time for a single step in seconds.
 */
function estimateStepTime(step: TestStep): number {
  let time = 0;
  if (step.do) {
    time += ACTION_TIMING[step.do] ?? 0.3;
  }
  if (step.expect) {
    time += ASSERTION_TIMING;
  }
  return time;
}

/**
 * Analyze the test-gen coverage and compute statistics.
 */
export async function analyze(rootDir: string, workers = 4): Promise<AnalysisResult> {
  // Scan page specs, component specs, and all component files
  const [pageSpecs, componentSpecs, allComponentFiles] = await Promise.all([
    scanSpecs(rootDir),
    scanComponentSpecs(rootDir),
    scanAllComponentFiles(rootDir),
  ]);

  // Build set of annotated component file paths
  const annotatedFilePaths = new Set(componentSpecs.map(c => c.filePath));

  // Per-app tracking
  const appMap = new Map<string, AppAnalysis>();

  function getApp(app: string): AppAnalysis {
    if (!appMap.has(app)) {
      appMap.set(app, { pages: 0, components: { total: 0, annotated: 0 }, flows: 0, steps: 0 });
    }
    return appMap.get(app)!;
  }

  // Count page stats
  let totalPageFlows = 0;
  let totalPageSteps = 0;
  let totalStepTime = 0;

  for (const page of pageSpecs) {
    const app = getApp(page.app);
    app.pages++;
    app.flows += page.spec.flows.length;
    totalPageFlows += page.spec.flows.length;

    for (const flow of page.spec.flows) {
      const stepCount = flow.steps.length;
      app.steps += stepCount;
      totalPageSteps += stepCount;

      // Timing: per-test overhead + sum of step times
      totalStepTime += PER_TEST_OVERHEAD;
      for (const step of flow.steps) {
        totalStepTime += estimateStepTime(step);
      }
    }
  }

  // Count component stats per app from allComponentFiles
  const appComponentFiles = new Map<string, string[]>();
  for (const filePath of allComponentFiles) {
    // Extract app name from path
    const rel = filePath.replace(/\\/g, '/');
    const match = rel.match(/apps\/([^/]+)\//);
    const app = match ? match[1] : 'unknown';
    if (!appComponentFiles.has(app)) {
      appComponentFiles.set(app, []);
    }
    appComponentFiles.get(app)!.push(filePath);
  }

  for (const [app, files] of appComponentFiles) {
    const appAnalysis = getApp(app);
    appAnalysis.components.total = files.length;
    appAnalysis.components.annotated = files.filter(f => annotatedFilePaths.has(f)).length;
  }

  // Add component spec flows/steps to app stats
  for (const comp of componentSpecs) {
    const app = getApp(comp.app);
    app.flows += comp.spec.flows.length;
    for (const flow of comp.spec.flows) {
      app.steps += flow.steps.length;

      totalStepTime += PER_TEST_OVERHEAD;
      for (const step of flow.steps) {
        totalStepTime += estimateStepTime(step);
      }
    }
  }

  // Audit all component files for interactive elements
  const missingComponents: Array<{ file: string; interactiveElements: number }> = [];

  for (const filePath of allComponentFiles) {
    if (!annotatedFilePaths.has(filePath)) {
      const audit = auditJsx(filePath);
      if (audit.interactiveElementCount > 0) {
        missingComponents.push({
          file: filePath,
          interactiveElements: audit.interactiveElementCount,
        });
      }
    }
  }

  // Sort missing components by interactive element count (descending)
  missingComponents.sort((a, b) => b.interactiveElements - a.interactiveElements);

  // Compute average steps per flow from current data
  const totalCurrentFlows = totalPageFlows + componentSpecs.reduce((s, c) => s + c.spec.flows.length, 0);
  const totalCurrentSteps = totalPageSteps + componentSpecs.reduce((s, c) => {
    return s + c.spec.flows.reduce((fs, f) => fs + f.steps.length, 0);
  }, 0);
  const avgStepsPerFlow = totalCurrentFlows > 0 ? totalCurrentSteps / totalCurrentFlows : 4;

  // Project additional flows from missing components
  // Use ceil(interactiveElementCount / 4) per missing component
  let projectedAdditionalFlows = 0;
  for (const missing of missingComponents) {
    projectedAdditionalFlows += Math.ceil(missing.interactiveElements / 4);
  }
  const projectedAdditionalSteps = Math.round(projectedAdditionalFlows * avgStepsPerFlow);

  // Compute execution times
  const currentSequential = totalStepTime;
  const currentParallel = totalStepTime / workers;

  // Projected additional time
  const avgTimePerStep = totalCurrentSteps > 0 ? (totalStepTime - totalCurrentFlows * PER_TEST_OVERHEAD) / totalCurrentSteps : 0.5;
  const projectedAdditionalTime =
    projectedAdditionalFlows * PER_TEST_OVERHEAD +
    projectedAdditionalSteps * avgTimePerStep;

  const projectedSequential = currentSequential + projectedAdditionalTime;
  const projectedParallel = projectedSequential / workers;

  return {
    perApp: appMap,
    totalPages: pageSpecs.length,
    totalPageFlows,
    totalPageSteps,
    totalComponentFiles: allComponentFiles.length,
    annotatedComponents: componentSpecs.length,
    missingComponents,
    projectedAdditionalFlows,
    projectedAdditionalSteps,
    currentExecutionTime: {
      sequential: Math.round(currentSequential * 10) / 10,
      parallel: Math.round(currentParallel * 10) / 10,
    },
    projectedExecutionTime: {
      sequential: Math.round(projectedSequential * 10) / 10,
      parallel: Math.round(projectedParallel * 10) / 10,
    },
  };
}
