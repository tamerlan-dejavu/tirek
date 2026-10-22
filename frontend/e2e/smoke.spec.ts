import { expect, test, type Page } from "@playwright/test";

// Runs against a seeded demo stack: DEMO_MODE=true, `.\tirek.ps1 seed`.

async function pickRole(page: Page, title: string) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Кто вы?" })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(title) }).click();
}

test("landing page links to the platform", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Вход" }).first()).toBeVisible();
});

test("protected pages redirect to login", async ({ page }) => {
  await page.goto("/buildings");
  await expect(page).toHaveURL(/\/login/);
});

test("engineer lands on the overview", async ({ page }) => {
  await pickRole(page, "Инженер ЕИТЦ");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Техническая обстановка" })).toBeVisible();
});

test("resident sees their home, not engineering data", async ({ page }) => {
  await pickRole(page, "Житель");
  await expect(page).toHaveURL(/\/resident/);
  await expect(page.getByText("Сообщить о проблеме").first()).toBeVisible();
  await page.goto("/defects");
  await expect(page.getByText("Протечка кровли")).toHaveCount(0);
});

test("dispatcher lands on the request queue", async ({ page }) => {
  await pickRole(page, "Диспетчер");
  await expect(page).toHaveURL(/\/requests/);
  await expect(page.getByText("REQ-2026-0003")).toBeVisible();
});

test("foreign provider does not see the building (AC-02)", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /войти по email/ }).click();
  await page.getByLabel("Email").fill("admin@other.local");
  await page.getByLabel("Пароль").fill(process.env.E2E_PASSWORD ?? "tirek-demo-2026");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.goto("/buildings");
  await expect(page.getByText("пр. Достык, 12")).toHaveCount(0);
});
