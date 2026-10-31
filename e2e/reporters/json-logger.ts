import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestLog {
  suite: string;
  test: string;
  status: string;
  duration: number;
  project: string;
  steps: Array<{ title: string; duration: number; status: string }>;
  errors: string[];
  retries: number;
  artifacts: {
    trace: string | null;
    screenshots: string[];
    video: string | null;
    errorContext: string | null;
    outputDir: string | null;
  };
}

class JsonLogReporter implements Reporter {
  private logs: TestLog[] = [];
  private outputDir: string;
  private filePath: string = '';
  private startTime: number = 0;

  constructor(options: { outputDir?: string } = {}) {
    this.outputDir =
      options.outputDir || path.join(process.cwd(), 'test-results', 'logs');
  }

  onBegin(_config: FullConfig, _suite: Suite) {
    fs.mkdirSync(this.outputDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.filePath = path.join(this.outputDir, `test-run-${timestamp}.json`);
    this.startTime = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const steps = result.steps.map((step) => ({
      title: step.title,
      duration: step.duration,
      status: step.error ? 'failed' : 'passed',
    }));

    const errors = result.errors.map((e) => e.message || String(e));

    const cwd = process.cwd();
    let trace: string | null = null;
    const screenshots: string[] = [];
    let video: string | null = null;
    let errorContext: string | null = null;
    let outputDir: string | null = null;

    for (const attachment of result.attachments) {
      if (!attachment.path) continue;
      const rel = path.relative(cwd, attachment.path).replace(/\\/g, '/');

      if (attachment.name === 'trace') {
        trace = rel;
        outputDir = path.dirname(rel);
      } else if (attachment.name === 'screenshot' || attachment.name?.startsWith('test-failed')) {
        screenshots.push(rel);
      } else if (attachment.name === 'video') {
        video = rel;
      } else if (attachment.name === 'error-context') {
        errorContext = rel;
      }
    }

    if (!outputDir && trace) {
      outputDir = path.dirname(trace);
    }

    const projectName = test.parent?.project()?.name || 'unknown';

    this.logs.push({
      suite: test.parent.title,
      test: test.title,
      status: result.status,
      duration: result.duration,
      project: projectName,
      steps,
      errors,
      retries: result.retry,
      artifacts: { trace, screenshots, video, errorContext, outputDir },
    });

    this.writeReport('running');
  }

  private writeReport(status: string) {
    const report = {
      timestamp: new Date().toISOString(),
      status,
      duration: Date.now() - this.startTime,
      total: this.logs.length,
      passed: this.logs.filter((l) => l.status === 'passed').length,
      failed: this.logs.filter((l) => l.status === 'failed').length,
      skipped: this.logs.filter((l) => l.status === 'skipped').length,
      setupPhases: this.parseSetupPhases(),
      tests: this.logs,
    };
    fs.writeFileSync(this.filePath, JSON.stringify(report, null, 2));
  }

  private parseSetupPhases() {
    const authDir = path.join(process.cwd(), '.auth');
    const startLogPath = path.join(process.cwd(), 'start.log');

    function parsePhaseLog(filename: string) {
      const filePath = path.join(authDir, filename);
      if (!fs.existsSync(filePath)) return null;
      const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
      return lines.map(line => {
        const spaceIdx = line.indexOf(' ');
        return { timestamp: line.slice(0, spaceIdx), message: line.slice(spaceIdx + 1) };
      });
    }

    function extractPhase(events: Array<{ timestamp: string; message: string }> | null) {
      if (!events || events.length === 0) return null;
      const lastStarted = [...events].reverse().find(e => e.message.startsWith('STARTED'));
      if (!lastStarted) return null;
      const startTime = new Date(lastStarted.timestamp).getTime();
      const matchingCompleted = events.find(
        e => e.message.startsWith('COMPLETED') && new Date(e.timestamp).getTime() >= startTime
      );
      const started = lastStarted.timestamp;
      const completed = matchingCompleted?.timestamp || null;
      const cached = matchingCompleted?.message.includes('(cached)') || false;
      const duration = completed ? new Date(completed).getTime() - startTime : null;
      return { started, completed, duration, cached };
    }

    function extractWarmupPages(events: Array<{ timestamp: string; message: string }> | null) {
      if (!events) return [];
      return events
        .filter(e => e.message.startsWith('PAGE '))
        .map(e => {
          const match = e.message.match(/^PAGE (\S+) (\w+) (\d+)ms$/);
          if (!match) return null;
          return { url: match[1], status: match[2], duration: parseInt(match[3]) };
        })
        .filter(Boolean);
    }

    const authEvents = parsePhaseLog('auth-setup.log');
    const dataEvents = parsePhaseLog('data-setup.log');
    const warmupEvents = parsePhaseLog('warmup.log');

    let serverStart: string | null = null;
    if (fs.existsSync(startLogPath)) {
      serverStart = fs.readFileSync(startLogPath, 'utf8').trim();
    }

    return {
      serverStart,
      auth: extractPhase(authEvents),
      dataSeed: extractPhase(dataEvents),
      warmup: { ...extractPhase(warmupEvents), pages: extractWarmupPages(warmupEvents) },
    };
  }

  private pruneOldReports(keep: number) {
    const files = fs.readdirSync(this.outputDir)
      .filter(f => f.startsWith('test-run-') && f.endsWith('.json'))
      .sort();
    const toDelete = files.slice(0, Math.max(0, files.length - keep));
    for (const f of toDelete) {
      fs.unlinkSync(path.join(this.outputDir, f));
    }
  }

  onEnd(result: FullResult) {
    this.writeReport(result.status);
    this.pruneOldReports(3);
    console.log(`\nJSON report written to: ${this.filePath}`);
  }
}

export default JsonLogReporter;
