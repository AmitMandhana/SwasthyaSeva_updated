import { test as base, type Page } from '@playwright/test';

interface NetworkEntry {
  timestamp: number;
  type: 'request' | 'response' | 'failed';
  method: string;
  url: string;
  status?: number;
}

interface ConsoleEntry {
  timestamp: number;
  type: string;
  text: string;
}

type TestFixtures = {
  networkLogs: NetworkEntry[];
  consoleLogs: ConsoleEntry[];
};

export const test = base.extend<TestFixtures>({
  networkLogs: async ({}, use) => {
    const logs: NetworkEntry[] = [];
    await use(logs);
  },
  consoleLogs: async ({}, use) => {
    const logs: ConsoleEntry[] = [];
    await use(logs);
  },
  page: async ({ page, networkLogs, consoleLogs }, use, testInfo) => {
    // Network interception
    page.on('request', (request) => {
      networkLogs.push({
        timestamp: Date.now(),
        type: 'request',
        method: request.method(),
        url: request.url(),
      });
    });

    page.on('response', (response) => {
      networkLogs.push({
        timestamp: Date.now(),
        type: 'response',
        method: response.request().method(),
        url: response.url(),
        status: response.status(),
      });
    });

    page.on('requestfailed', (request) => {
      networkLogs.push({
        timestamp: Date.now(),
        type: 'failed',
        method: request.method(),
        url: request.url(),
      });
    });

    // Console error capture
    page.on('console', (msg) => {
      consoleLogs.push({
        timestamp: Date.now(),
        type: msg.type(),
        text: msg.text(),
      });
    });

    page.on('pageerror', (error) => {
      consoleLogs.push({
        timestamp: Date.now(),
        type: 'error',
        text: error.message,
      });
    });

    await use(page);

    // After test: attach logs if test failed
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('network-logs', {
        body: JSON.stringify(networkLogs, null, 2),
        contentType: 'application/json',
      });
      await testInfo.attach('console-logs', {
        body: JSON.stringify(consoleLogs, null, 2),
        contentType: 'application/json',
      });
    }
  },
});

export { expect } from '@playwright/test';
