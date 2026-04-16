import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/settings");
    await page.waitForLoadState("networkidle");
  });

  test("Settings navigation renders all sections", async ({ page }) => {
    await expect(page.locator("text=Profile").first()).toBeVisible();
    await expect(page.locator("text=Security").first()).toBeVisible();
    await expect(page.locator("text=Notifications").first()).toBeVisible();
    await expect(page.locator("text=Appearance").first()).toBeVisible();
    await expect(page.locator("text=Storage").first()).toBeVisible();
    await expect(page.locator("text=Connected Apps").first()).toBeVisible();
    await expect(page.locator("text=About CloudSpace").first()).toBeVisible();
  });

  test("Profile section - edit and save", async ({ page }) => {
    await page.locator("button:has-text('Profile')").first().click();
    await page.waitForTimeout(500);
    const nameInput = page.locator("input").first();
    await nameInput.clear();
    await nameInput.fill("Piyush Edited");
    await page.waitForTimeout(300);
    const saveBtn = page.getByRole("button", { name: "Save changes" }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test("Profile discard changes", async ({ page }) => {
    await page.locator("button:has-text('Profile')").first().click();
    await page.waitForTimeout(500);
    const nameInput = page.locator("input").first();
    await nameInput.clear();
    await nameInput.fill("Temp Name");
    await page.waitForTimeout(300);
    // Use exact match to avoid strict mode
    const discardBtn = page.getByRole("button", { name: "Discard", exact: true });
    if (await discardBtn.isVisible()) {
      await discardBtn.click();
      await page.waitForTimeout(300);
    } else {
      const altBtn = page.getByRole("button", { name: "Discard changes" });
      if (await altBtn.isVisible()) {
        await altBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test("Security section", async ({ page }) => {
    await page.locator("button:has-text('Security')").first().click();
    await page.waitForTimeout(500);
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("Security - active sessions", async ({ page }) => {
    await page.locator("button:has-text('Security')").first().click();
    await page.waitForTimeout(500);
    await expect(page.locator("text=/This device/i").first()).toBeVisible();
  });

  test("Notifications section", async ({ page }) => {
    await page.locator("button:has-text('Notifications')").first().click();
    await page.waitForTimeout(500);
    const switches = page.locator('[role="switch"]');
    const count = await switches.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test("Appearance section", async ({ page }) => {
    await page.locator("button:has-text('Appearance')").first().click();
    await page.waitForTimeout(500);
    await expect(page.locator("text=Light").first()).toBeVisible();
    await expect(page.locator("text=Dark").first()).toBeVisible();

    await page.locator("text=Dark").first().click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.locator("text=Light").first().click();
  });

  test("Storage section", async ({ page }) => {
    await page.locator("button:has-text('Storage')").first().click();
    await page.waitForTimeout(500);
    await expect(page.locator("text=GB").first()).toBeVisible();
  });

  test("Connected Apps section", async ({ page }) => {
    await page.locator("button:has-text('Connected Apps')").first().click();
    await page.waitForTimeout(500);
    const revokeBtn = page.getByRole("button", { name: /Revoke/i }).first();
    await expect(revokeBtn).toBeVisible();
  });

  test("About section", async ({ page }) => {
    await page.locator("button:has-text('About CloudSpace')").first().click();
    await page.waitForTimeout(500);
    await expect(page.locator("text=0.1.0").first()).toBeVisible();
  });
});
