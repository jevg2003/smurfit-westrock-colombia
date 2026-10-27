import { describe, expect, it } from "vitest";
import { fieldMeta } from "@/lib/schema-meta";
import { DEFAULT_TEXT_CHARS, OTHER_CHOICE, OTHER_MAX_CHARS, answerFormSchema } from "./answer-form";

describe("answerFormSchema", () => {
  it("takes the text limit of an open question from the question, or the default", () => {
    expect(fieldMeta(answerFormSchema({ kind: "text", maxChars: 150 }), "text")).toMatchObject({ maxLength: 150, required: true });
    expect(fieldMeta(answerFormSchema({ kind: "text" }), "text").maxLength).toBe(DEFAULT_TEXT_CHARS);
  });

  it("limits the free answer of a choice question", () => {
    expect(fieldMeta(answerFormSchema({ kind: "single" }), "text").maxLength).toBe(OTHER_MAX_CHARS);
  });

  it("requires a choice for selection questions", () => {
    const result = answerFormSchema({ kind: "single" }).safeParse({ choices: [], text: "" });
    expect(result.success).toBe(false);
  });

  it("requires the text when Otra is chosen", () => {
    const result = answerFormSchema({ kind: "multi" }).safeParse({ choices: [OTHER_CHOICE], text: "" });
    expect(result.success).toBe(false);
    expect(answerFormSchema({ kind: "multi" }).safeParse({ choices: [OTHER_CHOICE], text: "Algo" }).success).toBe(true);
  });

  it("rejects an open answer over the question limit", () => {
    expect(answerFormSchema({ kind: "text", maxChars: 5 }).safeParse({ choices: [], text: "123456" }).success).toBe(false);
  });
});
