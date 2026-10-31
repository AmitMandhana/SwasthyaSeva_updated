import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.test' });

const isCI = !!process.env.CI;

const projArgIdx = process.argv.indexOf('--project');
const projectSlug = projArgIdx >= 0
  ? (process.argv[projArgIdx + 1] || 'default').replace('local-', '')
  : 'default';

export default defineConfig({
  globalTeardown: './e2e/global-teardown.ts',
  testDir: './e2e/generated',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: 4,
  reporter: [
    ['html', { open: 'never', outputFolder: `playwright-report/${projectSlug}` }],
    ['list'],
    ['./e2e/reporters/json-logger.ts'],
  ],
  use: {
    trace: 'on',
    video: 'retain-on-failure',
    screenshot: 'on',
    actionTimeout: 30_000,
    geolocation: { latitude: 22.5726, longitude: 88.3639 },
    permissions: ['geolocation'],
    extraHTTPHeaders: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
  },
  expect: { timeout: 15_000 },
  timeout: 90_000,

  projects: [
    {
      name: 'setup',
      testDir: './e2e',
      testMatch: 'auth.setup.ts',
      outputDir: './test-results/_setup',
    },
    {
      name: 'data-setup',
      testDir: './e2e',
      testMatch: 'data.setup.ts',
      outputDir: './test-results/_data-setup',
      dependencies: ['setup'],
    },

    // Local environment
    {
      name: 'local-web',
      testDir: './e2e/generated/web',
      outputDir: './test-results/web',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3000' },
      dependencies: ['setup', 'data-setup'],
    },
    {
      name: 'local-admin',
      testDir: './e2e/generated/admin',
      outputDir: './test-results/admin',
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3001' },
      dependencies: ['setup', 'data-setup'],
    },
    {
      name: 'local-doctor',
      testDir: './e2e/generated/doctor',
      outputDir: './test-results/doctor',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3002' },
      dependencies: ['setup', 'data-setup'],
    },
    {
      name: 'local-clinic',
      testDir: './e2e/generated/clinic',
      outputDir: './test-results/clinic',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3003' },
      dependencies: ['setup', 'data-setup'],
    },

    // Screenshot capture (hand-written, not generated)
    {
      name: 'screenshots',
      testDir: './e2e',
      testMatch: 'capture-screenshots.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup', 'data-setup'],
      timeout: 60_000,
    },

    // Prescription PDF golden capture (hand-written)
    {
      name: 'prescription-pdfs',
      testDir: './e2e',
      testMatch: 'capture-prescription-pdfs.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      timeout: 120_000,
    },

    // Cross-app flows (hand-written, not generated)
    {
      name: 'cross-app',
      testDir: './e2e',
      testMatch: 'cross-app-flows.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      timeout: 120_000,
    },

    // Specialty format tests (hand-written)
    {
      name: 'specialty-formats',
      testDir: './e2e',
      testMatch: /specialty.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup', 'data-setup'],
      timeout: 120_000,
    },
  ],
});
