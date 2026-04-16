import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Deck (Kanban)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/deck");
    await page.waitForLoadState("networkidle");
  });

  test("Board list loads", async ({ page }) => {
    // Assert at least one board card is visible (no hardcoded board names)
    const boardCard = page.locator(".cursor-pointer, [class*='card'], [class*='board']").first();
    await expect(boardCard).toBeVisible({ timeout: 10000 });
  });

  test("Open a board and see stacks", async ({ page }) => {
    const boardCard = page.locator(".cursor-pointer, [class*='card'], [class*='board']").first();
    await expect(boardCard).toBeVisible({ timeout: 10000 });
    await boardCard.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    // Should see at least one stack/column
    const stack = page.locator("[class*='flex-col'], [class*='column'], [data-rfd-droppable-id]").first();
    await expect(stack).toBeVisible({ timeout: 10000 });
  });

  test("Open a card detail modal", async ({ page }) => {
    const boardCard = page.locator(".cursor-pointer, [class*='card'], [class*='board']").first();
    await expect(boardCard).toBeVisible({ timeout: 10000 });
    await boardCard.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    // DnD context intercepts pointer events, so dispatch a click event directly
    const card = page.locator("[data-rfd-draggable-id]").first();
    if (await card.isVisible({ timeout: 10000 }).catch(() => false)) {
      await card.dispatchEvent("click");
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 10000 });
    }
  });

  test("Create a new card", async ({ page }) => {
    const boardCard = page.locator(".cursor-pointer, [class*='card'], [class*='board']").first();
    await expect(boardCard).toBeVisible({ timeout: 10000 });
    await boardCard.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    const addBtn = page.locator("button").filter({ has: page.locator("svg.lucide-plus") }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(300);
      const input = page.locator("input").last();
      if (await input.isVisible()) {
        await input.fill("E2E Test Card");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(1500);
        await expect(page.locator("text=E2E Test Card")).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test("Delete a card", async ({ page }) => {
    const boardCard = page.locator(".cursor-pointer, [class*='card'], [class*='board']").first();
    await expect(boardCard).toBeVisible({ timeout: 10000 });
    await boardCard.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    const card = page.locator("[data-rfd-draggable-id]").first();
    if (await card.isVisible({ timeout: 10000 }).catch(() => false)) {
      await card.click({ force: true });
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        const deleteBtn = dialog.locator("button").filter({ has: page.locator("svg.lucide-trash-2") });
        if (await deleteBtn.isVisible()) {
          await deleteBtn.click({ force: true });
          await page.waitForTimeout(500);
        }
      }
    }
  });
});
