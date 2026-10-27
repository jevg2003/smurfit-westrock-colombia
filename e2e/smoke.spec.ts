import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { seedCompany } from "./support";

const fixture = (path: string) => readFileSync(resolve(process.cwd(), "src/infrastructure/sources", path), "utf8");

const SECOP = fixture("datos-gov-co/secop-contratos/fixtures/secop-contratos.sample.json");
const SUPERSOCIEDADES = fixture("datos-gov-co/supersociedades/fixtures/supersociedades.sample.json");
const EXPORTS = fixture("datos-gov-co/exportaciones/fixtures/exportaciones.sample.json");
const GDP = fixture("world-bank/fixtures/gdp-growth.col.json");
const CPI = fixture("world-bank/fixtures/cpi-inflation.col.json");
const XM = fixture("xm/fixtures/prec-bols-naci.json");
const DECREES = JSON.parse(fixture("regulation/fixtures/decretos.sample.json")) as Array<{ titulo: string; descripcion: string; url: string; fecha: string }>;

/** Thirty days of TRM, newest first, in the shape datos.gov.co answers. */
function trmRows() {
  const day = 24 * 60 * 60 * 1000;
  const start = Date.UTC(2026, 9, 19);
  return Array.from({ length: 30 }, (_, i) => {
    const from = new Date(start - i * day).toISOString().slice(0, 10);
    return { valor: String(3900 + (i % 7) * 4.5), unidad: "COP", vigenciadesde: `${from}T00:00:00.000`, vigenciahasta: `${from}T00:00:00.000` };
  });
}

const json = (body: string) => ({ status: 200, contentType: "application/json", body });

/** Replaces every external data source with a small fixture so the suite does not depend on the network. */
async function mockSources(page: Page) {
  await page.route("**/datos.gov.co/resource/**", (route) => {
    const url = route.request().url();
    if (url.includes("mcec-87by")) return route.fulfill(json(JSON.stringify(trmRows())));
    if (url.includes("jbjy-vk9h")) return route.fulfill(json(SECOP));
    if (url.includes("6cat-2gcs")) return route.fulfill(json(SUPERSOCIEDADES));
    if (url.includes("vwqt-xc3z")) return route.fulfill(json(EXPORTS));
    return route.fulfill(json("[]"));
  });
  await page.route("**/api.worldbank.org/**", (route) => route.fulfill(json(route.request().url().includes("FP.CPI") ? CPI : GDP)));
  const fetchedAt = "2026-10-19T12:00:00.000Z";
  await page.route("**/api/news**", (route) =>
    route.fulfill(
      json(
        JSON.stringify({
          items: [{ id: "n1", title: "Acero laminado: demanda estable", url: "https://example.com/n1", outlet: "Portafolio", publishedAt: fetchedAt, via: "rss", feedId: "portafolio-economia" }],
          feeds: [{ id: "portafolio-economia", outlet: "Portafolio", status: "ok", count: 1 }],
          fetchedAt,
        }),
      ),
    ),
  );
  await page.route("**/api/regulacion**", (route) =>
    route.fulfill(
      json(
        JSON.stringify({
          minambiente: { status: "ok", items: [] },
          presidencia: {
            status: "ok",
            items: DECREES.slice(0, 3).map((d, i) => ({ id: `d${i}`, kind: "decree", title: d.titulo, summary: d.descripcion, url: d.url, publishedAt: `${d.fecha.slice(0, 19)}.000Z` })),
          },
          fetchedAt,
        }),
      ),
    ),
  );
  await page.route("**/api/energia**", (route) => route.fulfill(json(XM)));
}

const ROUTES = [
  "/home", "/senales", "/alertas", "/linea-de-tiempo", "/contratacion", "/briefing", "/preferencias", "/macro",
  "/competidores", "/seguimiento", "/noticias", "/regulacion", "/pestel", "/asistente", "/dias", "/fuentes", "/acerca",
];

const isThirdPartyAbort = (text: string) => /ERR_ABORTED|net::ERR_|Failed to load resource/i.test(text);

test.describe("Smoke", () => {
  for (const route of ROUTES) {
    test(`${route} renders its heading and the disclaimer without page errors`, async ({ page }, testInfo) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error" && !isThirdPartyAbort(message.text())) consoleErrors.push(message.text());
      });
      await seedCompany(page);
      await mockSources(page);

      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await expect(page.getByText(/herramienta independiente/i).first()).toBeVisible();
      // Let late client fetches settle so their errors are collected before asserting.
      await page.waitForLoadState("networkidle");

      await testInfo.attach("console-errors.txt", { body: consoleErrors.join("\n---\n") || "(none)", contentType: "text/plain" });
      expect(pageErrors, "uncaught page errors").toEqual([]);
    });
  }
});

test.describe("Mobile layout (375px)", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  for (const route of ["/home", "/alertas", "/briefing"]) {
    test(`${route} has no horizontal page scroll`, async ({ page }) => {
      await mockSources(page);
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
});
