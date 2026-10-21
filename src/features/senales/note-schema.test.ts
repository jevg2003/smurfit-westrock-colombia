import { describe, expect, it } from "vitest";
import { DISMISS_NOTE_REQUIRED, noteSchema } from "./note-schema";

describe("noteSchema", () => {
  it("requires a note to dismiss, ignoring blank spaces", () => {
    const result = noteSchema(() => "dismiss").safeParse({ note: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([["note", DISMISS_NOTE_REQUIRED]]);
    expect(DISMISS_NOTE_REQUIRED).toBe("Escribe una nota para descartar la alerta.");
  });

  it("accepts a note to dismiss", () => {
    expect(noteSchema(() => "dismiss").safeParse({ note: "Contrato ya renovado" }).success).toBe(true);
  });

  it("does not need a note to mark as reviewed", () => {
    expect(noteSchema(() => "review").safeParse({ note: "" }).success).toBe(true);
  });
});
