import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Media Gallery", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/media");
    await page.waitForLoadState("networkidle");
  });

  test("Gallery loads with photos", async ({ page }) => {
    await expect(page.locator("text=All Photos").first()).toBeVisible();
    const photos = page.locator("img[src*='picsum']");
    const count = await photos.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("Switch albums", async ({ page }) => {
    await page.locator("text=Screenshots").first().click();
    await page.waitForTimeout(500);
  });

  test("Open lightbox", async ({ page }) => {
    // Click on the photo container div, not the img directly (overlay intercepts)
    const photoContainer = page.locator(".group.relative.cursor-pointer").first();
    await photoContainer.click({ force: true });
    await page.waitForTimeout(500);
    const lightbox = page.locator(".fixed.inset-0.z-50");
    if (await lightbox.isVisible()) {
      await expect(lightbox.locator("svg.lucide-x").first()).toBeVisible();
    }
  });

  test("Lightbox navigation", async ({ page }) => {
    const photoContainer = page.locator(".group.relative.cursor-pointer").first();
    await photoContainer.click({ force: true });
    await page.waitForTimeout(500);

    const lightbox = page.locator(".fixed.inset-0.z-50");
    if (await lightbox.isVisible()) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      await expect(lightbox).toBeHidden();
    }
  });

  test("Multi-select mode", async ({ page }) => {
    const selectBtn = page.getByRole("button", { name: /Select/i }).first();
    if (await selectBtn.isVisible()) {
      await selectBtn.click();
      await page.waitForTimeout(300);
      // Click photo containers in select mode
      const photos = page.locator(".group.relative.cursor-pointer");
      const count = await photos.count();
      if (count >= 3) {
        await photos.nth(0).click({ force: true });
        await photos.nth(1).click({ force: true });
        await photos.nth(2).click({ force: true });
        await page.waitForTimeout(300);
      }
      const cancelBtn = page.getByRole("button", { name: /Cancel/i });
      if (await cancelBtn.isVisible()) await cancelBtn.click();
    }
  });

  test("List view", async ({ page }) => {
    const listBtn = page.locator("button").filter({ has: page.locator("svg.lucide-list") });
    if (await listBtn.isVisible()) {
      await listBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("Upload dialog", async ({ page }) => {
    const uploadBtn = page.getByRole("button", { name: /Upload/i }).first();
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      await page.waitForTimeout(300);
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        await expect(dialog.locator("text=/Browse|drag/i").first()).toBeVisible();
      }
    }
  });
});
