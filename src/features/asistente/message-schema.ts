import { z } from "zod";
import { requiredText } from "@/core/company/fields";

/** Longest message the assistant box accepts. */
export const MESSAGE_MAX = 2000;

/** The message box: some text, up to `MESSAGE_MAX` characters. */
export const messageSchema = z.object({ message: requiredText(MESSAGE_MAX, "Escriba su pregunta.") });
