import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const INFRA_DIR = __dirname;
const FORBIDDEN = ["@/features", "@/app", "@/components"];

function listTsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return listTsFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("src/infrastructure architecture", () => {
  it("does not import from features, app or components (depend inward on core)", () => {
    const files = listTsFiles(INFRA_DIR).filter((file) => !file.endsWith("architecture.test.ts"));
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return [...source.matchAll(/from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)]
        .map((m) => m[1] ?? m[2])
        .filter((spec) => FORBIDDEN.some((name) => spec === name || spec.startsWith(`${name}/`)))
        .map((spec) => `${relative(INFRA_DIR, file).split(sep).join("/")}: ${spec}`);
    });
    expect(violations).toEqual([]);
  });
});
