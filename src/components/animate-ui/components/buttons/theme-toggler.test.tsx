// @vitest-environment jsdom
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// On the server next-themes has no theme yet (it reads localStorage only in the browser);
// in the browser the first render already gets the default theme ("dark").
let themeState: { theme?: string; resolvedTheme?: string } = {};
vi.mock("next-themes", () => ({
  useTheme: () => ({ ...themeState, setTheme: vi.fn() }),
}));

import { ThemeTogglerButton } from "./theme-toggler";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ThemeTogglerButton hydration", () => {
  it("hydrates the server markup without a mismatch when the client already knows the theme", async () => {
    themeState = {};
    const html = renderToString(<ThemeTogglerButton modes={["light", "dark"]} aria-label="Cambiar tema" />);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    themeState = { theme: "dark", resolvedTheme: "dark" };
    const recoverable: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <ThemeTogglerButton modes={["light", "dark"]} aria-label="Cambiar tema" />, {
        onRecoverableError: (error) => recoverable.push(error),
      });
    });

    expect(recoverable).toEqual([]);
    // After mount the real icon (moon for dark) is shown.
    expect(container.querySelector("svg.lucide-moon")).not.toBeNull();
  });
});
