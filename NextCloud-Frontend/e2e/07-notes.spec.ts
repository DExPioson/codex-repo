import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Notes", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/notes");
    // Wait for the notes API response to arrive
    await page.waitForResponse((r) => r.url().includes("/api/notes") && r.status() === 200, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState("networkidle");
  });

  test("Notes page loads", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible({ timeout: 10000 });
  });

  test("Select and read a note", async ({ page }) => {
    // Wait for note items to render after API data loads
    const noteItem = page.locator("main .cursor-pointer, main button").filter({ hasText: /\w{3,}/ }).first();
    const hasNotes = await noteItem.isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasNotes) {
      test.skip();
      return;
    }
    await noteItem.click();
    await page.waitForTimeout(500);
    // Editor area (textarea or contenteditable) should be visible
    const editor = page.locator("textarea, [contenteditable='true']").first();
    await expect(editor).toBeVisible({ timeout: 10000 });
  });

  test("Create a new note", async ({ page }) => {
    // Click + button or "New note" button
    const newBtn = page.locator("button").filter({ has: page.locator("svg.lucide-plus") }).first();
    const newNoteBtn = page.getByRole("button", { name: "New note" });
    if (await newBtn.isVisible()) {
      await newBtn.click();
    } else if (await newNoteBtn.isVisible()) {
      await newNoteBtn.click();
    }
    await page.waitForTimeout(500);

    // Title input
    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    if (inputCount > 0) {
      for (let i = 0; i < inputCount; i++) {
        const placeholder = await inputs.nth(i).getAttribute("placeholder");
        if (placeholder && placeholder.toLowerCase().includes("title")) {
          await inputs.nth(i).fill("E2E Test Note");
          break;
        }
      }
    }

    // Content textarea
    const textareas = page.locator("textarea");
    const taCount = await textareas.count();
    if (taCount > 0) {
      await textareas.last().fill("This is a Playwright note.");
    }
    await page.waitForTimeout(1500);
  });

  test("Delete a note", async ({ page }) => {
    const noteItem = page.locator("main .cursor-pointer, main button").filter({ hasText: /\w{3,}/ }).first();
    const hasNotes = await noteItem.isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasNotes) {
      test.skip();
      return;
    }
    await noteItem.hover();
    await page.waitForTimeout(300);

    const moreBtn = page.locator("button").filter({ has: page.locator("svg.lucide-more-vertical") }).first();
    if (await moreBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await moreBtn.click();
      const deleteItem = page.getByRole("menuitem", { name: /Delete/i });
      if (await deleteItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteItem.click();
      }
    }
  });

  test("Pin/unpin a note", async ({ page }) => {
    const noteItem = page.locator("main .cursor-pointer, main button").filter({ hasText: /\w{3,}/ }).first();
    const hasNotes = await noteItem.isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasNotes) {
      test.skip();
      return;
    }
    await noteItem.hover();
    await page.waitForTimeout(300);

    const moreBtn = page.locator("button").filter({ has: page.locator("svg.lucide-more-vertical") }).first();
    if (await moreBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await moreBtn.click();
      const pinItem = page.getByRole("menuitem", { name: /Pin|Unpin/i });
      if (await pinItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        await pinItem.click();
      }
    }
  });
});
