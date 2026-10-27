import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { saveWithFeedback } from "./notify";

describe("saveWithFeedback", () => {
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
  });

  it("runs the save and confirms it", () => {
    const save = vi.fn();
    expect(saveWithFeedback(save)).toBe(true);
    expect(save).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith("Cambios guardados", expect.anything());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("reports a save that throws instead of confirming it", () => {
    expect(
      saveWithFeedback(() => {
        throw new Error("QuotaExceededError");
      }),
    ).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("No se pudieron guardar los cambios", expect.anything());
    expect(toast.success).not.toHaveBeenCalled();
  });
});
