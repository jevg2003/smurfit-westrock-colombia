import { z } from "zod";

export const DISMISS_NOTE_REQUIRED = "Escribe una nota para descartar la alerta.";

export type NoteIntent = "review" | "dismiss";

/**
 * The note box has two buttons. Marking a signal as reviewed never needs a note; dismissing it
 * does. The pressed button is a form value (`intent`), so one form serves both.
 */
export const noteSchema = z
  .object({ note: z.string(), intent: z.enum(["review", "dismiss"]) })
  .superRefine((value, ctx) => {
    if (value.intent === "dismiss" && value.note.trim() === "") {
      ctx.addIssue({ code: "custom", path: ["note"], message: DISMISS_NOTE_REQUIRED });
    }
  });
