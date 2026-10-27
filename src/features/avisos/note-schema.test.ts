import { describe, expect, it } from "vitest";
import { fieldMeta } from "@/lib/schema-meta";
import { DISMISS_NOTE_REQUIRED, NOTE_MAX, noteSchema } from "./note-schema";

describe("noteSchema", () => {
  it("requires a note to dismiss, ignoring blank spaces", () => {
    const result = noteSchema.safeParse({ note: "   ", intent: "dismiss" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([["note", DISMISS_NOTE_REQUIRED]]);
    expect(DISMISS_NOTE_REQUIRED).toBe("Escriba una nota para descartar el aviso.");
  });

  it("accepts a note to dismiss", () => {
    expect(noteSchema.safeParse({ note: "Contrato ya renovado", intent: "dismiss" }).success).toBe(true);
  });

  it("does not need a note to mark as reviewed", () => {
    expect(noteSchema.safeParse({ note: "", intent: "review" }).success).toBe(true);
  });
});

describe("note limit", () => {
  it("limits the note and exposes the limit to the field", () => {
    expect(noteSchema.safeParse({ note: "x".repeat(NOTE_MAX + 1), intent: "review" }).success).toBe(false);
    expect(fieldMeta(noteSchema, "note")).toMatchObject({ maxLength: NOTE_MAX, required: false });
    expect(NOTE_MAX).toBe(500);
  });
});
