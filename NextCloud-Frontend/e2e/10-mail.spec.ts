import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Mail", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/mail");
    await page.waitForLoadState("networkidle");
  });

  test("Mail folders load", async ({ page }) => {
    await expect(page.locator("text=Inbox").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Sent").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Drafts").first()).toBeVisible({ timeout: 10000 });
  });

  test("Inbox loads with messages", async ({ page }) => {
    await page.locator("button:has-text('Inbox')").first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    // Assert at least one message row is visible (no hardcoded subjects/senders)
    const messageRow = page.locator(".cursor-pointer").first();
    await expect(messageRow).toBeVisible({ timeout: 10000 });
  });

  test("Read an email", async ({ page }) => {
    const emailRow = page.locator(".cursor-pointer").first();
    await expect(emailRow).toBeVisible({ timeout: 10000 });
    await emailRow.click();
    await page.waitForTimeout(1000);
  });

  test("Star an email", async ({ page }) => {
    const starBtn = page.locator("svg.lucide-star").first();
    if (await starBtn.isVisible()) {
      await starBtn.click({ force: true });
      await page.waitForTimeout(300);
    }
  });

  test("Switch folders", async ({ page }) => {
    await page.locator("button:has-text('Sent')").first().click();
    await page.waitForTimeout(1000);
    await page.locator("button:has-text('Drafts')").first().click();
    await page.waitForTimeout(1000);
    await page.locator("button:has-text('Inbox')").first().click();
  });

  test("Search emails", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='Search' i]").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await page.waitForTimeout(500);
    }
  });

  test("Compose a new email", async ({ page }) => {
    const composeBtn = page.locator("button").filter({ has: page.locator("svg.lucide-square-pen") }).first();
    if (await composeBtn.isVisible()) {
      await composeBtn.click();
    } else {
      await page.getByRole("button", { name: /Compose/i }).click();
    }
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
  });

  test("Delete an email", async ({ page }) => {
    const emailRow = page.locator(".cursor-pointer").first();
    if (await emailRow.isVisible()) {
      await emailRow.click();
      await page.waitForTimeout(1000);
      const deleteBtn = page.locator("button").filter({ has: page.locator("svg.lucide-trash-2") }).first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click({ force: true });
        await page.waitForTimeout(500);
      }
    }
  });
});
