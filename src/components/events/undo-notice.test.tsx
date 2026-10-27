// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UNDO_NOTICE_MS, UndoNoticeHost, dismissUndoNotice, notifyUndo } from "./undo-notice";

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  act(() => dismissUndoNotice());
  cleanup();
  vi.useRealTimers();
});

describe("UndoNoticeHost", () => {
  it("shows a short message with Deshacer and runs the undo once", async () => {
    const undo = vi.fn();
    render(<UndoNoticeHost />);

    act(() => notifyUndo("Descartado.", undo));
    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));

    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Descartado.")).not.toBeInTheDocument();
  });

  it("disappears after six seconds without undoing", () => {
    const undo = vi.fn();
    render(<UndoNoticeHost />);

    act(() => notifyUndo("Revisado.", undo));
    expect(screen.getByRole("status")).toHaveTextContent("Revisado.");
    act(() => vi.advanceTimersByTime(UNDO_NOTICE_MS + 10));

    expect(screen.queryByText("Revisado.")).not.toBeInTheDocument();
    expect(undo).not.toHaveBeenCalled();
  });

  it("keeps only the latest notice", () => {
    render(<UndoNoticeHost />);

    act(() => notifyUndo("Primero.", vi.fn()));
    act(() => notifyUndo("Segundo.", vi.fn()));

    expect(screen.queryByText("Primero.")).not.toBeInTheDocument();
    expect(screen.getByText("Segundo.")).toBeInTheDocument();
  });
});
