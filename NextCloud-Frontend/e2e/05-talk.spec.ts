import { test, expect, type Page } from "@playwright/test";
import { login, navigateTo } from "./helpers";

async function openUsableConversation(page: Page) {
  const noteToSelf = page.locator("aside button").filter({ hasText: /Note to self/i }).first();
  if (await noteToSelf.isVisible().catch(() => false)) {
    await noteToSelf.click();
    return;
  }

  const conversations = page.locator("aside button").filter({ hasText: /\S/ });
  const count = await conversations.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = conversations.nth(index);
    const label = (await candidate.textContent())?.trim() || "";
    if (!/Talk updates/i.test(label)) {
      await candidate.click();
      return;
    }
  }

  await conversations.first().click();
}

test.describe("Talk", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/talk");
    await page.waitForLoadState("networkidle");
  });

  test("Conversation list loads", async ({ page }) => {
    const conversationButton = page.locator("aside button").filter({ hasText: /\S/ }).first();
    await expect(conversationButton).toBeVisible({ timeout: 10000 });
  });

  test("Open a conversation and load messages", async ({ page }) => {
    await openUsableConversation(page);

    const composer = page.locator("textarea").first();
    await expect(composer).toBeVisible({ timeout: 10000 });
    await expect(page.locator("main, div").filter({ hasText: /No messages yet|Today|Yesterday|\w+/ }).first()).toBeVisible();
  });

  test("Send a message in a writable conversation", async ({ page }) => {
    await openUsableConversation(page);

    const composer = page.locator("textarea").first();
    await expect(composer).toBeVisible({ timeout: 10000 });

    const message = `Playwright Talk ${Date.now()}`;
    await composer.fill(message);
    const sendRequest = page.waitForResponse(
      (response) =>
        response.url().includes("/api/conversations/") &&
        response.url().includes("/messages") &&
        response.request().method() === "POST" &&
        response.status() === 200,
      { timeout: 20000 },
    );
    await page.getByRole("button").filter({ has: page.locator("svg.lucide-send-horizontal") }).click();
    await sendRequest;

    await page.reload();
    await page.waitForLoadState("networkidle");
    await openUsableConversation(page);
    await expect(page.getByText(message)).toBeVisible({ timeout: 20000 });
  });
});
