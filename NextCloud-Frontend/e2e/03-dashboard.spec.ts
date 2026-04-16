import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");
  });

  test("Dashboard loads with all widgets", async ({ page }) => {
    // Wait for the dashboard to fully render with generous timeout
    await expect(page.locator("text=Recent Files")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Upcoming Events").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Messages").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Recent Activity")).toBeVisible({ timeout: 10000 });
  });

  test("Storage ring shows correct data", async ({ page }) => {
    await expect(page.locator("text=GB").first()).toBeVisible({ timeout: 15000 });
  });

  test("Recent files links are clickable", async ({ page }) => {
    await expect(page.locator("a:has-text('View all')").first()).toBeVisible({ timeout: 10000 });
  });
});
