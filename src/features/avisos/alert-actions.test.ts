import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSignal } from "@/stores/test-utils";
import { useAlertsStore } from "@/stores/alerts.store";

const notifyUndo = vi.fn();
vi.mock("@/components/events/undo-notice", () => ({ notifyUndo: (...args: unknown[]) => notifyUndo(...args) }));

import { dismissWithUndo, reopenWithUndo, reviewWithUndo } from "./alert-actions";

const SIGNAL = makeSignal("trm:2026-10-19");
const alertOf = () => useAlertsStore.getState().alerts.find((alert) => alert.signalId === SIGNAL.id);
const undoOfLastNotice = () => (notifyUndo.mock.calls.at(-1) as [string, () => void])[1];

describe("alert actions with undo", () => {
  beforeEach(() => {
    useAlertsStore.setState({ alerts: [] });
    notifyUndo.mockReset();
  });

  it("reviews a signal and offers to take it back to new", () => {
    reviewWithUndo(SIGNAL);

    expect(alertOf()?.state).toBe("reviewed");
    expect(notifyUndo).toHaveBeenCalledWith("Revisado.", expect.any(Function));

    undoOfLastNotice()();
    expect(alertOf()?.state).toBe("new");
  });

  it("marks a reviewed signal as pending again, and undo restores the review with its note", () => {
    useAlertsStore.getState().createFromSignal(SIGNAL);
    useAlertsStore.getState().review(SIGNAL.id, "Cierre de mes");

    reopenWithUndo(SIGNAL);
    expect(alertOf()?.state).toBe("new");
    expect(notifyUndo).toHaveBeenCalledWith("Marcado como pendiente.", expect.any(Function));

    undoOfLastNotice()();
    expect(alertOf()).toMatchObject({ state: "reviewed", note: "Cierre de mes" });
  });

  it("dismisses with a note and undo returns the signal to its previous state", () => {
    const result = dismissWithUndo(SIGNAL, "No aplica");

    expect(result.ok).toBe(true);
    expect(alertOf()).toMatchObject({ state: "dismissed", note: "No aplica" });
    expect(notifyUndo).toHaveBeenCalledWith("Descartado.", expect.any(Function));

    undoOfLastNotice()();
    expect(alertOf()?.state).toBe("new");
    expect(alertOf()?.note).toBeUndefined();
  });

  it("does not announce anything when dismissing is refused", () => {
    const result = dismissWithUndo(SIGNAL, "   ");

    expect(result.ok).toBe(false);
    expect(notifyUndo).not.toHaveBeenCalled();
    expect(alertOf()?.state).toBe("new");
  });
});
