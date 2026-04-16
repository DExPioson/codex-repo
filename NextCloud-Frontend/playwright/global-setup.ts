import { chromium, type FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, ".auth");
const STORAGE_STATE_PATH = path.join(AUTH_DIR, "session.json");

async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Log in via the API to establish a session cookie
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // POST login to get session cookie
  const response = await page.request.post("http://localhost:5001/api/auth/login", {
    data: {
      email: "cloudqa1",
      password: "CloudQA1!2026",
    },
  });

  if (!response.ok()) {
    throw new Error(`Global setup login failed: ${response.status()} ${response.statusText()}`);
  }

  // Save the authenticated storage state (cookies + localStorage)
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}

export default globalSetup;
