import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const CORE_DIR = __dirname;
const FORBIDDEN_PACKAGES = ["react", "next", "zustand"];
const FORBIDDEN_ALIASES = ["@/infrastructure", "@/features", "@/stores", "@/app"];

function listTsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return listTsFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

function importsOf(source: string): string[] {
  const pattern =
    /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|(?:^|\n)\s*import\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  return [...source.matchAll(pattern)].map((match) => match[1] ?? match[2] ?? match[3]);
}

function violation(specifier: string, file: string): string | null {
  const matches = (name: string) => specifier === name || specifier.startsWith(`${name}/`);
  if (FORBIDDEN_PACKAGES.some(matches)) return `forbidden package "${specifier}"`;
  if (FORBIDDEN_ALIASES.some(matches)) return `forbidden layer "${specifier}"`;
  if (specifier.startsWith(".")) {
    const target = relative(CORE_DIR, resolve(dirname(file), specifier));
    if (target.startsWith("..")) return `relative import leaves src/core "${specifier}"`;
  }
  return null;
}

describe("src/core architecture", () => {
  // This file embeds forbidden import samples for its self-check, so it is not scanned.
  const files = listTsFiles(CORE_DIR).filter((file) => !file.endsWith("architecture.test.ts"));

  it("scans the core sources", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("imports no framework, store or outer layer", () => {
    const violations = files.flatMap((file) =>
      importsOf(readFileSync(file, "utf8")).flatMap((specifier) => {
        const reason = violation(specifier, file);
        return reason ? [`${relative(CORE_DIR, file).split(sep).join("/")}: ${reason}`] : [];
      }),
    );
    expect(violations).toEqual([]);
  });

  it("detects forbidden imports (self-check)", () => {
    const sample = [
      'import { useState } from "react";',
      'import x from "@/stores/a";',
      'export * from "next/link";',
      'const m = await import("zustand");',
    ].join("\n");
    const found = importsOf(sample).map((specifier) => violation(specifier, join(CORE_DIR, "x.ts")));
    expect(found).toHaveLength(4);
    expect(found.every((reason) => reason !== null)).toBe(true);
  });
});
