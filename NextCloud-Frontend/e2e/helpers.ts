import { type Page, expect } from "@playwright/test";

export const BASE_URL = "http://localhost:5174";

export async function login(page: Page) {
  await page.goto("/#/");
  await page.waitForLoadState("networkidle");

  const onLogin = page.url().includes("/login");
  const sidebarVisible = !onLogin && (await page.locator("aside").isVisible().catch(() => false));
  if (sidebarVisible) return;

  await page.goto("/#/login");
  await page.waitForLoadState("networkidle");

  const email = page.locator("#email");
  const password = page.locator("#password");
  const hasLoginForm = await email.isVisible({ timeout: 3000 }).catch(() => false);

  if (hasLoginForm) {
    await email.fill("cloudqa1");
    await password.fill("CloudQA1!2026");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/#\/$/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("aside")).toBeVisible();
    return;
  }

  await page.request.post("/api/auth/login", {
    data: { email: "cloudqa1", password: "CloudQA1!2026" },
  });
  await page.goto("/#/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("aside")).toBeVisible();
}

export async function expectToast(page: Page, textMatch?: string | RegExp) {
  const toast = page.locator("#cs-toast");
  await expect(toast).toBeVisible({ timeout: 5000 });
  if (textMatch) {
    if (typeof textMatch === "string") {
      await expect(toast).toContainText(textMatch);
    } else {
      await expect(toast).toHaveText(textMatch);
    }
  }
}

export async function navigateTo(page: Page, path: string) {
  await page.goto(`/#${path}`);
  await page.waitForLoadState("networkidle");
}

export async function waitForData(page: Page) {
  await page.waitForLoadState("networkidle");
}
