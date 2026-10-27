import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Base UI sets data-orientation="horizontal|vertical"; the ui components style it with
// data-horizontal:/data-vertical:, which only work through these custom variants.
describe("globals.css orientation variants", () => {
  const css = readFileSync(join(__dirname, "globals.css"), "utf8");

  it.each([
    ["data-horizontal", "horizontal"],
    ["data-vertical", "vertical"],
  ])("maps %s to data-orientation=%s", (variant, value) => {
    expect(css).toContain(`@custom-variant ${variant} (&[data-orientation="${value}"]);`);
  });

  it("defines scrollbar-none to hide scrollbars in every engine", () => {
    expect(css).toMatch(/@utility scrollbar-none \{[^}]*scrollbar-width: none;/);
    expect(css).toContain("::-webkit-scrollbar");
  });
});
