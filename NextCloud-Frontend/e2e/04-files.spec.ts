import { test, expect } from "@playwright/test";
import { login, navigateTo } from "./helpers";

test.describe("File Browser", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, "/files");
    await page.waitForLoadState("networkidle");
  });

  test("Files page loads with toolbar actions", async ({ page }) => {
    await expect(page.getByRole("button", { name: "New Folder" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Upload" })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("nav button").first()).toBeVisible({ timeout: 10000 });
  });

  test("Create a folder and navigate into it", async ({ page }) => {
    const folderName = `E2E Folder ${Date.now()}`;

    await page.getByRole("button", { name: "New Folder" }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await dialog.locator("#folder-name").fill(folderName);
    await dialog.getByRole("button", { name: "Create" }).click();

    const folderRow = page.getByRole("button", { name: new RegExp(folderName) }).first();
    await expect(folderRow).toBeVisible({ timeout: 10000 });
    await folderRow.click();
    const breadcrumbs = page.locator("nav").last();
    await expect(breadcrumbs).toContainText(folderName, { timeout: 10000 });

    await breadcrumbs.locator("button").first().click();
    await expect(breadcrumbs).not.toContainText(folderName);
  });

  test("Upload, reload, download, and delete a file", async ({ page }) => {
    const fileName = `e2e-upload-${Date.now()}.txt`;
    const fileContents = `CloudSpace file smoke ${Date.now()}`;

    await page.locator('input[type="file"]').setInputFiles({
      name: fileName,
      mimeType: "text/plain",
      buffer: Buffer.from(fileContents, "utf8"),
    });

    await expect(page.getByText(`${fileName} uploaded`)).toBeVisible({ timeout: 10000 });
    const fileRowButton = page.getByRole("button", { name: new RegExp(fileName) }).first();
    await expect(fileRowButton).toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: new RegExp(fileName) }).first()).toBeVisible({ timeout: 10000 });

    const row = page.locator("div.grid").filter({ hasText: fileName }).last();
    await row.getByRole("button").last().click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(fileName);

    await row.getByRole("button").last().click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByText("Deleted successfully")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: new RegExp(fileName) }).first()).toHaveCount(0);
  });
});
