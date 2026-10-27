import { z } from "zod";
import { freeText } from "@/core/company/fields";

export const DISMISS_NOTE_REQUIRED = "Escriba una nota para descartar el aviso.";

/** Longest note of a reviewed or dismissed notice. */
export const NOTE_MAX = 500;

export type NoteIntent = "review" | "dismiss";

/**
 * The note box has two buttons. Marking a signal as reviewed never needs a note; dismissing it
 * does. The pressed button is a form value (`intent`), so one form serves both.
 */
export const noteSchema = z
  .object({ note: freeText(NOTE_MAX), intent: z.enum(["review", "dismiss"]) })
  .superRefine((value, ctx) => {
    if (value.intent === "dismiss" && value.note.trim() === "") {
      ctx.addIssue({ code: "custom", path: ["note"], message: DISMISS_NOTE_REQUIRED });
    }
  });
