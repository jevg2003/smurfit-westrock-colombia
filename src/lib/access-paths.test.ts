import { describe, expect, it } from "vitest";
import { PUBLIC_PATH_RULES, isPublicPath } from "./access-paths";

describe("isPublicPath", () => {
  it.each([
    "/",
    "/_next/static/chunks/main.js",
    "/_next/static/media/font.woff2",
    "/landing/hero.webp",
    "/landing/img/a/b.png",
    "/favicon.svg",
  ])("is public: %s", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each([
    "/api/chat",
    "/api/news",
    "/api/fuentes",
    "/home",
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
    "/favicon.svg.",
    "/favicon.svg/",
    "/favicon.svg/x",
    "/favicon.svg%00",
    "/Favicon.svg",
    "/FAVICON.SVG",
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
    expect(PUBLIC_PATH_RULES.length).toBe(4);
    for (const rule of PUBLIC_PATH_RULES) {
      expect(rule.description.length).toBeGreaterThan(5);
    }
  });
});
