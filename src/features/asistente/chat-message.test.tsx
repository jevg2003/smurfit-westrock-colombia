// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { afterEach, describe, expect, it } from "vitest";
import { ChatMessage } from "./chat-message";

afterEach(cleanup);

const answer = (metadata?: unknown): UIMessage =>
  ({ id: "a1", role: "assistant", parts: [{ type: "text", text: "Respuesta" }], metadata }) as UIMessage;

const renderAnswer = (message: UIMessage) =>
  render(<ChatMessage message={message} canRegenerate={false} streaming={false} onFeedback={() => {}} onRegenerate={() => {}} />);

describe("ChatMessage provider note", () => {
  it("says the backup provider answered, without internet search", () => {
    renderAnswer(answer({ provider: "openrouter", fallback: true }));
    expect(screen.getByText("Respondió con OpenRouter (respaldo): sin búsqueda en internet.")).toBeInTheDocument();
  });

  it.each([["no metadata", undefined], ["the primary provider", { provider: "openai", fallback: false }]])("shows no note for %s", (_name, metadata) => {
    renderAnswer(answer(metadata));
    expect(screen.queryByText(/OpenRouter/)).toBeNull();
  });
});
