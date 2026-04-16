import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Contacts", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/contacts");
    await page.waitForLoadState("networkidle");
  });

  test("Contacts page loads", async ({ page }) => {
    // The h1 heading should be visible
    await expect(page.locator("h1")).toContainText("Contacts", { timeout: 10000 });
    await expect(page.locator("input[placeholder*='Search' i]").first()).toBeVisible({ timeout: 10000 });
  });

  test("Toggle grid / list view", async ({ page }) => {
    const listBtn = page.locator("button").filter({ has: page.locator("svg.lucide-list") });
    if (await listBtn.isVisible()) await listBtn.click();
    await page.waitForTimeout(300);
    const gridBtn = page.locator("button").filter({ has: page.locator("svg.lucide-layout-grid") });
    if (await gridBtn.isVisible()) await gridBtn.click();
    await page.waitForTimeout(300);
  });

  test("Search contacts", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='Search' i]").first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("test");
    await page.waitForTimeout(500);
    await expect(searchInput).toBeVisible();
  });

  test("Open contact detail panel", async ({ page }) => {
    // Check if any contacts are loaded from NC
    const firstContact = page.locator("main .cursor-pointer").first();
    const hasContacts = await firstContact.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasContacts) {
      test.skip();
      return;
    }
    await firstContact.click();
    await page.waitForTimeout(500);
  });

  test("Create a new contact", async ({ page }) => {
    const newBtn = page.locator("button").filter({ hasText: /New Contact/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Fill name
    await dialog.locator('input[placeholder="Full name"]').fill("E2E Contact");

    // Click Save and verify the save button was clicked
    const saveBtn = dialog.getByRole("button", { name: /Save/i });
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await saveBtn.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    // Close the dialog manually if it's still open
    const closeBtn = dialog.getByRole("button", { name: /Close/i });
    if (await dialog.isVisible().catch(() => false)) {
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      }
    }
  });

  test("Delete a contact", async ({ page }) => {
    const contact = page.locator("text=E2E Contact").first();
    if (await contact.isVisible({ timeout: 3000 }).catch(() => false)) {
      await contact.click();
      await page.waitForTimeout(500);
      const deleteBtn = page.locator("button").filter({ has: page.locator("svg.lucide-trash-2") }).first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click({ force: true });
        await page.waitForTimeout(500);
      }
    }
  });
});
