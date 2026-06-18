import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT || 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === '1';
const workers = Number(process.env.PLAYWRIGHT_WORKERS || 1);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `env -u FORCE_COLOR NO_COLOR=1 AWS_SDK_JS_NODE_VERSION_SUPPORT_WARNING_DISABLED=true JOB_STORE_DRIVER=memory SEARCH_BACKEND=local USE_LANCEDB=false npm run dev -- --webpack --hostname 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
