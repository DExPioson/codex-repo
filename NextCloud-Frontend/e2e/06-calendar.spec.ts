import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Calendar", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/calendar");
    await page.waitForLoadState("networkidle");
  });

  test("Month view loads by default", async ({ page }) => {
    // Should see a month/year header
    await expect(page.locator("text=/\\w+ \\d{4}/").first()).toBeVisible({ timeout: 10000 });
    // Should see day cells
    const dayCells = page.locator('[class*="border"]').filter({ hasText: /^\d+$/ });
    expect(await dayCells.count()).toBeGreaterThan(0);
  });

  test("Switch between views", async ({ page }) => {
    await expect(page.locator("text=/\\w+ \\d{4}/").first()).toBeVisible({ timeout: 10000 });
    // Click Week
    const weekTab = page.locator("button:has-text('Week'), [role='tab']:has-text('Week')").first();
    if (await weekTab.isVisible()) {
      await weekTab.click();
      await page.waitForTimeout(300);
    }
    // Click Day
    const dayTab = page.locator("button:has-text('Day'), [role='tab']:has-text('Day')").first();
    if (await dayTab.isVisible()) {
      await dayTab.click();
      await page.waitForTimeout(300);
    }
    // Click Agenda
    const agendaTab = page.locator("button:has-text('Agenda'), [role='tab']:has-text('Agenda')").first();
    if (await agendaTab.isVisible()) {
      await agendaTab.click();
      await page.waitForTimeout(300);
    }
    // Back to Month
    const monthTab = page.locator("button:has-text('Month'), [role='tab']:has-text('Month')").first();
    if (await monthTab.isVisible()) {
      await monthTab.click();
    }
  });

  test("Navigate months", async ({ page }) => {
    await expect(page.locator("text=/\\w+ \\d{4}/").first()).toBeVisible({ timeout: 10000 });

    // Click next
    const nextBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).first();
    await nextBtn.click();
    await page.waitForTimeout(300);

    // Click previous
    const prevBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-left") }).first();
    await prevBtn.click();
    await page.waitForTimeout(300);

    // Click Today
    const todayBtn = page.getByRole("button", { name: "Today" });
    if (await todayBtn.isVisible()) {
      await todayBtn.click();
    }
  });

  test("Create a new event", async ({ page }) => {
    await expect(page.locator("text=/\\w+ \\d{4}/").first()).toBeVisible({ timeout: 10000 });
    // Look for a New Event button or + button
    const newEventBtn = page.locator("button").filter({ hasText: /New Event|Add/i }).first();
    if (await newEventBtn.isVisible()) {
      await newEventBtn.click();
    } else {
      // Click on a day cell to create
      const dayCell = page.locator("button:has-text('15')").first();
      if (await dayCell.isVisible()) await dayCell.click();
    }
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible()) {
      const titleInput = dialog.locator("input").first();
      await expect(titleInput).toBeVisible({ timeout: 10000 });
      await titleInput.fill("Playwright Test Event");
      const saveBtn = dialog.getByRole("button", { name: /Save|Create/i });
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForLoadState("networkidle");
        // Verify dialog closes (event may or may not appear on calendar depending on NC)
        await expect(dialog).toBeHidden({ timeout: 10000 });
      }
    }
  });

  test("Delete an event", async ({ page }) => {
    await expect(page.locator("text=/\\w+ \\d{4}/").first()).toBeVisible({ timeout: 10000 });
    // Click on an event chip
    const eventChip = page.locator("[class*='rounded'][class*='text-xs'][class*='truncate']").first();
    if (await eventChip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await eventChip.click();
      await page.waitForTimeout(300);
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        const deleteBtn = dialog.getByRole("button", { name: /Delete/i });
        if (await deleteBtn.isVisible()) {
          await deleteBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });
});
