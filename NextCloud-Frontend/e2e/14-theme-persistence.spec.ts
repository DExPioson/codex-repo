import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Theme & Persistence", () => {
  test("Dark mode persists across page reloads", async ({ page }) => {
    await login(page);
    await navigateTo(page, "/settings");
    await page.waitForTimeout(1000);

    // Go to Appearance
    await page.locator("button:has-text('Appearance')").first().click();
    await page.waitForTimeout(500);

    // Enable dark mode
    await page.locator("text=Dark").first().click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Reload
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Clean up: set back to light
    await page.locator("button:has-text('Appearance')").first().click();
    await page.waitForTimeout(500);
    await page.locator("text=Light").first().click();
  });

  test("Sidebar collapse persists across navigation", async ({ page }) => {
    await login(page);
    const sidebar = page.locator("aside");

    // Collapse
    await page.locator("aside > button").last().click();
    await expect(sidebar).toHaveCSS("width", "60px");

    // Navigate to Files
    await navigateTo(page, "/files");
    await page.waitForTimeout(500);
    await expect(sidebar).toHaveCSS("width", "60px");

    // Navigate to Notes
    await navigateTo(page, "/notes");
    await page.waitForTimeout(500);
    await expect(sidebar).toHaveCSS("width", "60px");
  });
});
