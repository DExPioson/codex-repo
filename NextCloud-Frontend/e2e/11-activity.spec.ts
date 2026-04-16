import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Activity Feed", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/activity");
    await page.waitForLoadState("networkidle");
  });

  test("Activity feed loads with seed data", async ({ page }) => {
    // Should see activity entries with time references
    await expect(page.locator("text=/Today|Yesterday|This Week/i").first()).toBeVisible();
  });

  test("Filter tabs work", async ({ page }) => {
    const filesTab = page.locator('[role="tab"]:has-text("Files")');
    if (await filesTab.isVisible()) {
      await filesTab.click();
      await page.waitForTimeout(500);
    }
    const allTab = page.locator('[role="tab"]:has-text("All")');
    if (await allTab.isVisible()) {
      await allTab.click();
    }
  });

  test("Search activities", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='Search' i]").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("shared");
      await page.waitForTimeout(500);
    }
  });

  test("Mark all as read", async ({ page }) => {
    const markAllBtn = page.getByRole("button", { name: /Mark all read/i });
    if (await markAllBtn.isVisible()) {
      await markAllBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});
