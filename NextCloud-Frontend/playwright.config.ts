import { defineConfig, devices } from "@playwright/test";

const APP_PORT = Number(process.env.VITE_PORT || 5173);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./playwright/global-setup.ts",
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    storageState: "playwright/.auth/session.json",
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
