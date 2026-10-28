// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormSkeleton, THINKING_PHASES } from "./form-skeleton";

describe("FormSkeleton", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("walks through the phases and stays on the last one", () => {
    render(<FormSkeleton phases={THINKING_PHASES} phaseMs={1000} />);
    expect(screen.getByRole("status")).toHaveTextContent(THINKING_PHASES[0]);
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getByRole("status")).toHaveTextContent(THINKING_PHASES[1]);
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.getByRole("status")).toHaveTextContent(THINKING_PHASES[2]);
  });

  it("keeps a single phase as a fixed label", () => {
    render(<FormSkeleton phases={["Recuperando su avance"]} phaseMs={1000} />);
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.getByRole("status")).toHaveTextContent("Recuperando su avance");
  });
});
