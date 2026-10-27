import { describe, expect, it } from "vitest";
import { DISMISS_NOTE_REQUIRED, noteSchema } from "./note-schema";

describe("noteSchema", () => {
  it("requires a note to dismiss, ignoring blank spaces", () => {
    const result = noteSchema.safeParse({ note: "   ", intent: "dismiss" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([["note", DISMISS_NOTE_REQUIRED]]);
    expect(DISMISS_NOTE_REQUIRED).toBe("Escribe una nota para descartar el aviso.");
  });

  it("accepts a note to dismiss", () => {
    expect(noteSchema.safeParse({ note: "Contrato ya renovado", intent: "dismiss" }).success).toBe(true);
  });

  it("does not need a note to mark as reviewed", () => {
    expect(noteSchema.safeParse({ note: "", intent: "review" }).success).toBe(true);
  });
});
