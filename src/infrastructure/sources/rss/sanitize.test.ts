import { describe, expect, it } from "vitest";
import { canonicalUrl, titleKey, toPlainText } from "./sanitize";

describe("toPlainText", () => {
  it("strips tags, decodes entities and collapses whitespace", () => {
    expect(toPlainText("  <b>Dólar</b> sube &amp; baja\n\t&#8211; hoy&nbsp;mismo ")).toBe("Dólar sube & baja – hoy mismo");
  });

  it("keeps escaped markup as inert text and never produces tags from entities of tags it stripped", () => {
    expect(toPlainText("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe("<script>alert(1)</script>");
    expect(toPlainText("<script>alert(1)</script>Hola")).toBe("alert(1)Hola");
  });

  it("removes control and bidirectional characters and limits the length", () => {
    expect(toPlainText("a\u0000b\u202Ec\u200Bd")).toBe("abcd");
    expect(toPlainText("x".repeat(400))).toHaveLength(300);
  });
});

describe("canonicalUrl", () => {
  it("drops tracking parameters, the hash and a trailing slash, and lowercases the host", () => {
    expect(canonicalUrl("https://WWW.Example.com/a/b/?utm_source=x&id=7&fbclid=1#frag")).toBe("https://www.example.com/a/b?id=7");
  });

  it("returns undefined for links that are not http(s)", () => {
    expect(canonicalUrl("javascript:alert(1)")).toBeUndefined();
    expect(canonicalUrl("data:text/html,<b>x</b>")).toBeUndefined();
    expect(canonicalUrl("not a url")).toBeUndefined();
    expect(canonicalUrl("ftp://example.com/x")).toBeUndefined();
  });
});

describe("titleKey", () => {
  it("ignores case, accents, punctuation and a trailing outlet suffix", () => {
    expect(titleKey("¡Dólar sube hoy! - El Tiempo", "El Tiempo")).toBe(titleKey("dolar sube hoy", "El Tiempo"));
  });
});
