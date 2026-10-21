import { expect, test } from "@playwright/test";

// Runs against a seeded stack: `make up && make migrate && make seed`.
const PASSWORD = process.env.E2E_PASSWORD ?? "tirek-demo-2026";

test("landing page links to the platform", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Вход в платформу" })).toBeVisible();
});

test("protected pages redirect to login", async ({ page }) => {
  await page.goto("/buildings");
  await expect(page).toHaveURL(/\/login/);
});

test("field specialist sees the assigned building", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("field@provider.local");
  await page.getByLabel("Пароль").fill(PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.goto("/buildings");
  await expect(page.getByText("пр. Достык, 12")).toBeVisible();
});

test("foreign provider does not see the building (AC-02)", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@other.local");
  await page.getByLabel("Пароль").fill(PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.goto("/buildings");
  await expect(page.getByText("пр. Достык, 12")).toHaveCount(0);
});
