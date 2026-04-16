import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const needsLoggedOutState =
      testInfo.title === "Login page renders correctly" ||
      testInfo.title === "Login fails with wrong credentials";

    if (!needsLoggedOutState) return;

    await page.context().clearCookies();
    await page.goto("/#/login");
    await page.waitForLoadState("networkidle");
  });

  test("Login page renders correctly", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "CloudSpace" })).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("Login fails with wrong credentials", async ({ page }) => {
    await page.locator("#email").fill("wrong@email.com");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="alert"]')).toContainText("Invalid Nextcloud credentials.");
    expect(page.url()).toContain("/#/login");
  });

  test("Login succeeds with correct credentials", async ({ page }) => {
    await login(page);
    expect(page.url()).toMatch(/\/#\/$/);
    await expect(page.locator("aside")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("banner")).toBeVisible({ timeout: 5000 });
  });

  test("Sign out via user dropdown", async ({ page }) => {
    await login(page);
    await page.getByRole("banner").locator("button.rounded-full.bg-primary").click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await page.waitForURL(/\/#\/login/, { timeout: 10000 });
    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });
  });
});
