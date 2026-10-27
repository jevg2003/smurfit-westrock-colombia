// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrandIntro, INTRO_DURATION_MS } from "./brand-intro";

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({ matches: reduce && query.includes("reduce"), media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
}

describe("BrandIntro", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockReducedMotion(false);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("plays once per session and hides itself when done", () => {
    vi.useFakeTimers();
    render(<BrandIntro />);
    expect(screen.getByRole("img", { name: "Smart Work Core" })).toBeTruthy();

    act(() => vi.advanceTimersByTime(INTRO_DURATION_MS + 1000));
    expect(screen.queryByRole("img", { name: "Smart Work Core" })).toBeNull();

    cleanup();
    render(<BrandIntro />);
    expect(screen.queryByRole("img", { name: "Smart Work Core" })).toBeNull();
  });

  it("can be skipped with a click", async () => {
    render(<BrandIntro />);
    await userEvent.click(screen.getByRole("button", { name: "Saltar intro" }));
    expect(screen.queryByRole("img", { name: "Smart Work Core" })).toBeNull();
  });

  it("does not play when the user prefers reduced motion", () => {
    mockReducedMotion(true);
    render(<BrandIntro />);
    expect(screen.queryByRole("img", { name: "Smart Work Core" })).toBeNull();
  });
});
