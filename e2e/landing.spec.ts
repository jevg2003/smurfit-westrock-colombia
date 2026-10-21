import { expect, test } from "@playwright/test";

/** Paths Cloudflare Access lets through without a login: the landing, its static assets and the favicon. */
function isPublicPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/favicon.svg" || pathname.startsWith("/_next/static/") || pathname.startsWith("/landing/");
}

const baseOrigin = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").origin;

test.describe("landing page", () => {
  test("shows the headline, the CTA and the prototype notice", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Prototipo independiente y no oficial. Sin relación ni aval de Smurfit Westrock.").first()).toBeVisible();
    await expect(page.getByText("Datos de ejemplo").first()).toBeVisible();
  });

  test("the main call to action goes to /home", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Entrar al monitor" }).first();
    await expect(cta).toHaveAttribute("href", "/home");
    await cta.click();
    await expect(page).toHaveURL(/\/home/);
  });

  test("only requests public paths and raises no page errors", async ({ page }) => {
    const errors: string[] = [];
    const outside: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol === "data:" || url.protocol === "blob:") return;
      if (url.origin !== baseOrigin) {
        outside.push(request.url());
        return;
      }
      if (!isPublicPath(url.pathname)) outside.push(url.pathname);
    });

    await page.goto("/", { waitUntil: "networkidle" });
    // Scroll to the bottom so lazy effects load before checking.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    expect(outside).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("has no horizontal scroll at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
