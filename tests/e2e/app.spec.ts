import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Send secure sign-in link" }).click();
  await page.getByRole("link", { name: /Open the local demo magic link/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Your money, in one clear view" })).toBeVisible();
}

async function navigateTo(page: import("@playwright/test").Page, destination: string) {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  const sidebar = page.locator('aside[aria-label="Primary navigation"]');
  if ((page.viewportSize()?.width ?? 1280) < 900) {
    await menuButton.click();
    await expect(sidebar).toHaveClass(/sidebar-open/);
  }
  await sidebar.getByRole("link", { name: destination }).click();
}

test("protects finance pages and completes local magic-link sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Your money, in one clear view" })).toBeVisible();
  await expect(page.getByText("Fictional demo data")).toBeVisible();
});

test("reviews and edits a transaction", async ({ page }) => {
  await signIn(page);
  await navigateTo(page, "Transactions");
  await expect(page.getByRole("heading", { name: "Review every dollar once" })).toBeVisible();
  await page.getByLabel("Search transactions").fill("Unknown merchant");
  await expect(page.getByText("SQ *MKT 00429")).toBeVisible();
  await page.getByLabel("Category for Unknown merchant").selectOption("groceries");
  await expect(page.getByLabel("Category for Unknown merchant")).toHaveValue("groceries");
});

test("adds a planned contribution to a goal", async ({ page }) => {
  await signIn(page);
  await navigateTo(page, "Goals");
  await expect(
    page.getByRole("heading", { name: "Give future money a clear purpose" }),
  ).toBeVisible();
  const button = page.getByRole("button", { name: /Add \$750/ }).first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByText("$10,500", { exact: true }).first()).toBeVisible();
});

test("serves health and installable manifest endpoints", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).mode).toBe("demo");
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const value = await manifest.json();
  expect(value.display).toBe("standalone");
  expect(value.icons).toHaveLength(2);
});
