import * as fs from 'fs';
import * as path from 'path';

const LOCK_DIR = path.join(process.cwd(), '.auth');
const STALE_THRESHOLD_MS = 120_000;
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 60_000;

function lockPath(name: string): string {
  return path.join(LOCK_DIR, `${name}.lock`);
}

function isStale(filePath: string): boolean {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Date.now() - new Date(content.timestamp).getTime() > STALE_THRESHOLD_MS;
  } catch {
    return true;
  }
}

export function acquireLock(name: string): boolean {
  const file = lockPath(name);
  fs.mkdirSync(LOCK_DIR, { recursive: true });

  if (fs.existsSync(file)) {
    if (isStale(file)) {
      fs.unlinkSync(file);
    } else {
      return false;
    }
  }

  try {
    fs.writeFileSync(file, JSON.stringify({ pid: process.pid, timestamp: new Date().toISOString() }), { flag: 'wx' });
    return true;
  } catch {
    return false;
  }
}

export function releaseLock(name: string): void {
  const file = lockPath(name);
  try {
    fs.unlinkSync(file);
  } catch {}
}

export async function waitForLock(name: string): Promise<void> {
  const file = lockPath(name);
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    if (!fs.existsSync(file)) return;
    if (isStale(file)) {
      try { fs.unlinkSync(file); } catch {}
      return;
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  try { fs.unlinkSync(file); } catch {}
}

export async function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  await waitForLock(name);

  if (!acquireLock(name)) {
    await waitForLock(name);
    if (!acquireLock(name)) {
      throw new Error(`Failed to acquire lock: ${name}`);
    }
  }

  try {
    return await fn();
  } finally {
    releaseLock(name);
  }
}
