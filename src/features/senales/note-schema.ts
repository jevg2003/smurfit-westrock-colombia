import { z } from "zod";

export const DISMISS_NOTE_REQUIRED = "Escribe una nota para descartar la alerta.";

export type NoteIntent = "review" | "dismiss";

/**
 * The note box has two buttons. Marking a signal as reviewed never needs a note; dismissing it
 * does. `getIntent` is read at validation time, so the same form serves both buttons.
 */
export function noteSchema(getIntent: () => NoteIntent) {
  return z.object({ note: z.string() }).superRefine((value, ctx) => {
    if (getIntent() === "dismiss" && value.note.trim() === "") {
      ctx.addIssue({ code: "custom", path: ["note"], message: DISMISS_NOTE_REQUIRED });
    }
  });
}
