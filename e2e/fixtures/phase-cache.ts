import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const START_LOG = path.join(ROOT, 'start.log');

function getServerStartTime(): number | null {
  try {
    const content = fs.readFileSync(START_LOG, 'utf8').trim();
    const time = new Date(content).getTime();
    return isNaN(time) ? null : time;
  } catch {
    return null;
  }
}

function getLastCompleted(logFile: string): number | null {
  try {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n').reverse();
    for (const line of lines) {
      if (line.includes('COMPLETED')) {
        const timestamp = line.split(' ')[0];
        const time = new Date(timestamp).getTime();
        if (!isNaN(time)) return time;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function shouldSkipPhase(logFile: string, ttlMs: number): boolean {
  const serverStart = getServerStartTime();
  const lastCompleted = getLastCompleted(logFile);

  if (lastCompleted === null) return false;
  if (serverStart !== null && lastCompleted < serverStart) return false;
  if (Date.now() - lastCompleted > ttlMs) return false;

  return true;
}
