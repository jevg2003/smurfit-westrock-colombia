// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntroCloser } from "./intro-closer";
import { INTRO_ATTR, INTRO_DURATION_MS, INTRO_ENTER_KEY, INTRO_LAST_KEY, INTRO_SCRIPT, INTRO_TTL_MS, markIntroFromLanding } from "./intro-policy";

const html = document.documentElement;

/** Runs the inline script the layout ships, exactly as the browser would before first paint. */
function runScript() {
  new Function(INTRO_SCRIPT)();
}

describe("intro policy (inline script)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    html.removeAttribute(INTRO_ATTR);
    history.replaceState(null, "", "/resumen");
  });

  it("never plays on the landing itself, and keeps the landing's request for the app", () => {
    history.replaceState(null, "", "/");
    markIntroFromLanding();
    runScript();
    expect(html.hasAttribute(INTRO_ATTR)).toBe(false);
    expect(sessionStorage.getItem(INTRO_ENTER_KEY)).toBe("1");
  });

  it("plays on the first visit and records when", () => {
    runScript();
    expect(html.getAttribute(INTRO_ATTR)).toBe("play");
    expect(Number(localStorage.getItem(INTRO_LAST_KEY))).toBeGreaterThan(0);
  });

  it("does not play again on reload or a new tab within the window", () => {
    localStorage.setItem(INTRO_LAST_KEY, String(Date.now() - 60_000));
    runScript();
    expect(html.hasAttribute(INTRO_ATTR)).toBe(false);
  });

  it("plays again once the window has passed", () => {
    localStorage.setItem(INTRO_LAST_KEY, String(Date.now() - INTRO_TTL_MS - 1));
    runScript();
    expect(html.getAttribute(INTRO_ATTR)).toBe("play");
  });

  it("always plays after a landing call to action, once", () => {
    localStorage.setItem(INTRO_LAST_KEY, String(Date.now()));
    markIntroFromLanding();
    runScript();
    expect(html.getAttribute(INTRO_ATTR)).toBe("play");
    expect(sessionStorage.getItem(INTRO_ENTER_KEY)).toBeNull();

    html.removeAttribute(INTRO_ATTR);
    runScript();
    expect(html.hasAttribute(INTRO_ATTR)).toBe(false);
  });
});

describe("IntroCloser", () => {
  beforeEach(() => html.setAttribute(INTRO_ATTR, "play"));

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    html.removeAttribute(INTRO_ATTR);
  });

  it("ends the intro after its duration", () => {
    vi.useFakeTimers();
    render(<IntroCloser />);
    act(() => vi.advanceTimersByTime(INTRO_DURATION_MS));
    expect(html.hasAttribute(INTRO_ATTR)).toBe(false);
  });

  it("can be skipped with a click", async () => {
    render(<IntroCloser />);
    await userEvent.click(screen.getByRole("button", { name: "Saltar intro" }));
    expect(html.hasAttribute(INTRO_ATTR)).toBe(false);
  });
});
