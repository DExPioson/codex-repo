import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("App Shell, Sidebar & TopBar", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Sidebar navigation links work", async ({ page }) => {
    const navItems = [
      { label: "Dashboard", route: "/" },
      { label: "Files", route: "/files" },
      { label: "Talk", route: "/talk" },
      { label: "Calendar", route: "/calendar" },
      { label: "Notes", route: "/notes" },
      { label: "Contacts", route: "/contacts" },
      { label: "Deck", route: "/deck" },
      { label: "Mail", route: "/mail" },
      { label: "Activity", route: "/activity" },
      { label: "Media", route: "/media" },
      { label: "Settings", route: "/settings" },
    ];

    for (const item of navItems) {
      const link = page.locator("aside a").filter({ hasText: item.label }).first();
      await expect(link).toBeVisible();
      await link.click();
      await page.waitForTimeout(300);
      expect(page.url()).toContain(`/#${item.route}`);
    }
  });

  test("Sidebar collapses and expands", async ({ page }) => {
    const sidebar = page.locator("aside");
    await page.locator("aside > button").last().click();
    await expect(sidebar).toHaveCSS("width", "60px");
    await page.locator("aside > button").last().click();
    await expect(sidebar).toHaveCSS("width", "240px");
  });

  test("Sidebar unread badges are visible", async ({ page }) => {
    await page.waitForTimeout(2000);
    const badges = page.locator("aside .animate-badge-pulse");
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("Command palette opens via button click", async ({ page }) => {
    await page.locator("header").locator("text=Search CloudSpace").click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("text=Quick actions")).toBeVisible();
  });

  test("Command palette search and navigation", async ({ page }) => {
    await page.locator("header").locator("text=Search CloudSpace").click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await dialog.locator("input").fill("notes");
    await expect(dialog.locator("button:has-text('Notes')").first()).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
  });

  test("Command palette keyboard navigation", async ({ page }) => {
    await page.locator("header").locator("text=Search CloudSpace").click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
  });

  test("Command palette closes with Escape", async ({ page }) => {
    await page.locator("header").locator("text=Search CloudSpace").click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toBeHidden();
  });

  test("Notification bell popover", async ({ page }) => {
    const bellBtn = page.locator("header button").filter({ has: page.locator("svg.lucide-bell") });
    await bellBtn.click();
    const popover = page.locator('[data-radix-popper-content-wrapper]');
    await expect(popover).toBeVisible();
    await expect(popover.locator("text=Notifications")).toBeVisible();
    await expect(popover.locator("text=Mark all read")).toBeVisible();
    await expect(popover.locator("text=View all activity")).toBeVisible();
  });

  test("User dropdown menu", async ({ page }) => {
    await page.locator("header").locator("text=PS").click();
    await expect(page.getByRole("menuitem", { name: "Profile settings" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Appearance" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Keyboard shortcuts" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();

    await page.getByRole("menuitem", { name: "Keyboard shortcuts" }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("text=Keyboard shortcuts")).toBeVisible();
  });

  test("Dark mode toggle via Appearance", async ({ page }) => {
    await navigateTo(page, "/settings");
    await page.waitForTimeout(1000);
    await page.locator("button:has-text('Appearance')").first().click();
    await page.waitForTimeout(500);

    // Click Dark theme
    await page.locator("text=Dark").first().click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Click Light theme
    await page.locator("text=Light").first().click();
    await page.waitForTimeout(200);
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass || "").not.toContain("dark");
  });
});
