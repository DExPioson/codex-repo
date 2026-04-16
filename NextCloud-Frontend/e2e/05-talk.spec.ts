import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("Talk / Chat", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/talk");
    await page.waitForLoadState("networkidle");
  });

  test("Conversation list loads", async ({ page }) => {
    // Assert at least one conversation item is visible (no hardcoded names)
    const convoItem = page.locator("button.cursor-pointer, [class*='conversation'], aside button").first();
    await expect(convoItem).toBeVisible({ timeout: 10000 });
  });

  test("Select a conversation and view messages", async ({ page }) => {
    // Click the first conversation in the list
    const convoItem = page.locator("button.cursor-pointer, [class*='conversation'], aside button").first();
    await expect(convoItem).toBeVisible({ timeout: 10000 });
    await convoItem.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    // Messages area or textarea should be visible
    const messageArea = page.locator("textarea, .rounded-2xl").first();
    await expect(messageArea).toBeVisible({ timeout: 10000 });
  });

  test("Send a message", async ({ page }) => {
    const convoItem = page.locator("button.cursor-pointer, [class*='conversation'], aside button").first();
    await expect(convoItem).toBeVisible({ timeout: 10000 });
    await convoItem.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.fill("Hello from Playwright test");
    const sendBtn = page.locator("button").filter({ has: page.locator("svg.lucide-send-horizontal") });
    await sendBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator("text=Hello from Playwright test").first()).toBeVisible({ timeout: 10000 });
  });

  test("Info panel toggle", async ({ page }) => {
    const convoItem = page.locator("button.cursor-pointer, [class*='conversation'], aside button").first();
    await expect(convoItem).toBeVisible({ timeout: 10000 });
    await convoItem.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    const infoBtn = page.locator("button").filter({ has: page.locator("svg.lucide-panel-right") });
    await expect(infoBtn).toBeVisible({ timeout: 10000 });
    await infoBtn.click();
    await page.waitForTimeout(500);
    // Info panel should be visible
    const infoPanel = page.locator("text=/Members|Shared|Files|About/i").first();
    await expect(infoPanel).toBeVisible({ timeout: 10000 });
    await infoBtn.click();
  });

  test("Search conversations", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='Search' i]").first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    // Type a single common letter to get results
    await searchInput.fill("a");
    await page.waitForTimeout(500);
    await expect(searchInput).toBeVisible();
  });

  test("Create a new group conversation", async ({ page }) => {
    const newBtn = page.locator("button").filter({ has: page.locator("svg.lucide-square-pen") });
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const groupTab = dialog.locator('[role="tab"]').filter({ hasText: "Group" });
    if (await groupTab.isVisible()) {
      await groupTab.click();
      await page.waitForTimeout(300);
    }

    // Fill group name
    await dialog.locator("input").first().fill("E2E Test Group");
    await page.waitForTimeout(500);

    // Select concrete member rows used by the Talk dialog implementation.
    await dialog.getByRole("button", { name: /Rohan Mehra/i }).click();
    await dialog.getByRole("button", { name: /Priya Kapoor/i }).click();
    await page.waitForTimeout(300);

    const createBtn = dialog.getByRole("button", { name: /Create group/i });
    await expect(createBtn).toBeEnabled({ timeout: 5000 });
    await createBtn.click();
    await page.waitForTimeout(1500);
    // Verify dialog closed or group appeared
    const dialogGone = await dialog.isHidden({ timeout: 5000 }).catch(() => false);
    const groupVisible = await page.locator("text=E2E Test Group").isVisible({ timeout: 5000 }).catch(() => false);
    expect(dialogGone || groupVisible).toBeTruthy();
  });

  test("Cross-user connecting flow works (call, video accept, screen share)", async ({ browser }) => {
    test.setTimeout(90_000);
    const contextA = await browser.newContext({ storageState: "playwright/.auth/session.json" });
    const pageA = await contextA.newPage();
    await login(pageA);
    await navigateTo(pageA, "/talk");
    const convoA = pageA.getByRole("button", { name: /Priya Kapoor|Rohan Mehra|Arjun Singh/i }).first();
    await expect(convoA).toBeVisible({ timeout: 10000 });
    await convoA.click();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.request.post("/api/auth/login", {
      data: { email: "cloudqa2", password: "CloudQA2!2026" },
    });
    await pageB.goto("/#/talk");
    await pageB.waitForLoadState("networkidle");
    const convoB = pageB.getByRole("button", { name: /Priya Kapoor|Rohan Mehra|Arjun Singh/i }).first();
    await expect(convoB).toBeVisible({ timeout: 10000 });
    await convoB.click();

    const callBtnA = pageA.locator("button").filter({ has: pageA.locator("svg.lucide-monitor-up") }).first();
    await expect(callBtnA).toBeVisible({ timeout: 10000 });
    await callBtnA.click();
    const acceptBtnB = pageB.getByRole("button", { name: /Accept/i });
    await expect(acceptBtnB).toBeVisible({ timeout: 10000 });
    await acceptBtnB.click();

    const callOverlayA = pageA.locator(".fixed.inset-0.z-50");
    const callOverlayB = pageB.locator(".fixed.inset-0.z-50");
    await expect(callOverlayA).toBeVisible({ timeout: 10000 });
    await expect(callOverlayB).toBeVisible({ timeout: 10000 });

    await expect(pageB.locator("text=/sharing their screen|You are sharing your screen/i").first()).toBeVisible({ timeout: 10000 });

    await contextA.close();
    await contextB.close();
  });

  test("Voice call UI", async ({ page }) => {
    const convoItem = page.getByRole("button", { name: /Priya Kapoor|Rohan Mehra|Arjun Singh/i }).first();
    await expect(convoItem).toBeVisible({ timeout: 10000 });
    await convoItem.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    const callBtn = page.locator("button").filter({ has: page.locator("svg.lucide-phone") }).first();
    await expect(callBtn).toBeVisible({ timeout: 10000 });
    await callBtn.click();
    await page.waitForTimeout(500);
    const overlay = page.locator(".fixed.inset-0.z-50");
    await expect(overlay).toBeVisible({ timeout: 10000 });
    const endBtn = page.locator("button").filter({ has: page.locator("svg.lucide-phone-off") });
    await endBtn.click();
    await page.waitForTimeout(500);
  });

  test("Incoming call simulation", async ({ page }) => {
    const convoItem = page.getByRole("button", { name: /Priya Kapoor|Rohan Mehra|Arjun Singh/i }).first();
    await expect(convoItem).toBeVisible({ timeout: 10000 });
    await convoItem.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    const simBtn = page.locator("button").filter({ has: page.locator("svg.lucide-phone-incoming") });
    await expect(simBtn).toBeVisible({ timeout: 10000 });
    await simBtn.click();
    const declineBtn = page.getByRole("button", { name: /Decline/i });
    await expect(declineBtn).toBeVisible({ timeout: 10000 });
    await declineBtn.click();
  });
});
