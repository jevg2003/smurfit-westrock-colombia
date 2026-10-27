import { describe, expect, it } from "vitest";
import { PUBLIC_PATH_RULES, isPublicPath } from "./access-paths";

describe("isPublicPath", () => {
  it.each([
    "/",
    "/_next/static/chunks/main.js",
    "/_next/static/media/font.woff2",
    "/landing/hero.webp",
    "/landing/img/a/b.png",
    "/icon.svg",
    "/favicon.ico",
    "/apple-touch-icon.png",
  ])("is public: %s", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each([
    "/api/chat",
    "/api/news",
    "/api/fuentes",
    "/resumen",
    "/noticias",
    "/_next/image",
    "/_next/image?url=%2Flanding%2Fa.webp",
    "/_next/data/x",
    "/_next/data/build/home.json",
    "/_next/static",
    "/_next/static/",
    "/landingx",
    "/landing",
    "/landing/",
    "/landing/../api/chat",
    "/landing/%2e%2e/api/chat",
    "/landing/%2E%2E/api/chat",
    "/%2e%2e/api/chat",
    "/_next/static/../../api/chat",
    "/_next/static/%2e%2e/%2e%2e/api/chat",
    "/landing/..%2fapi/chat",
    "/landing/%2e%2e%2fapi/chat",
    String.raw`/landing\..\api\chat`,
    "//",
    "//landing/a.png",
    "/landing//a.png",
    "/_next//static/a.js",
    "/favicon.svg",
    "/icon.svg.",
    "/icon.svg/",
    "/icon.svg/x",
    "/icon.svg%00",
    "/Icon.svg",
    "/FAVICON.ICO",
    "/favicon.ico/x",
    "/apple-touch-icon.png.",
    "/apple-touch-icon.png/x",
    "/Apple-Touch-Icon.png",
    "/Landing/a.png",
    "/LANDING/a.png",
    "/_NEXT/static/a.js",
    "/_Next/Static/a.js",
    "/%66avicon.svg",
    "/landing/%",
    "/landing/a.png.",
    "/landing/.",
    "/landing/./a.png",
    "",
    "home",
    "/index",
    "/ ",
  ])("is protected: %s", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });

  it("documents each rule", () => {
    expect(PUBLIC_PATH_RULES.length).toBe(6);
    for (const rule of PUBLIC_PATH_RULES) {
      expect(rule.description.length).toBeGreaterThan(5);
    }
  });
});
