// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { LandingFooter } from "./sections";

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  document.documentElement.className = "";
  localStorage.clear();
});

describe("LandingFooter theme switch", () => {
  it("shows a labelled theme button that changes the theme class", async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="landing-test">
        <LandingFooter />
      </ThemeProvider>,
    );
    const button = await screen.findByRole("button", { name: "Cambiar tema" });
    expect(document.documentElement).toHaveClass("dark");
    await userEvent.click(button);
    await expect.poll(() => document.documentElement.classList.contains("dark")).toBe(false);
  });
});
