import { describe, expect, it } from "vitest";
import { fieldMeta } from "@/lib/schema-meta";
import { MESSAGE_MAX, messageSchema } from "./message-schema";

describe("messageSchema", () => {
  it("needs some text, ignoring blank spaces", () => {
    expect(messageSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(messageSchema.safeParse({ message: "¿Cómo está la TRM?" }).success).toBe(true);
  });

  it("limits the length and exposes the limit to the field", () => {
    expect(messageSchema.safeParse({ message: "x".repeat(MESSAGE_MAX + 1) }).success).toBe(false);
    expect(fieldMeta(messageSchema, "message")).toMatchObject({ required: true, maxLength: MESSAGE_MAX });
  });
});
