import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("File Browser", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/files");
    await page.waitForLoadState("networkidle");
  });

  test("File browser loads with seed data", async ({ page }) => {
    // Should see folder icons (seed has folders)
    await expect(page.locator("svg.lucide-folder").first()).toBeVisible();
    // Footer or items visible
    const items = page.locator("text=/\\d+ items/");
    await expect(items).toBeVisible({ timeout: 5000 });
  });

  test("Toggle between grid and list view", async ({ page }) => {
    const gridBtn = page.locator("button").filter({ has: page.locator("svg.lucide-layout-grid") });
    await gridBtn.click();
    await page.waitForTimeout(500);
    // Grid should be visible
    await expect(page.locator(".grid").first()).toBeVisible();

    const listBtn = page.locator("button").filter({ has: page.locator("svg.lucide-list") });
    await listBtn.click();
    await page.waitForTimeout(300);
  });

  test("Navigate into a folder and back with breadcrumb", async ({ page }) => {
    // Click a folder (the clickable area with the folder icon + name)
    const folderRow = page.locator(".cursor-pointer").filter({ has: page.locator("svg.lucide-folder") }).first();
    await folderRow.click();
    await page.waitForTimeout(1000);

    // Click Home in breadcrumb to go back
    const breadcrumbHome = page.locator("nav button").filter({ has: page.locator("svg.lucide-home") });
    if (await breadcrumbHome.isVisible()) {
      await breadcrumbHome.click();
      await page.waitForTimeout(1000);
    }
  });

  test("Create a new folder", async ({ page }) => {
    await page.getByRole("button", { name: "New Folder" }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await dialog.locator("#folder-name").fill("Test Folder E2E");
    await dialog.getByRole("button", { name: "Create" }).click();
    await page.waitForTimeout(1500);
    await expect(page.locator("text=Test Folder E2E")).toBeVisible();
  });
});
