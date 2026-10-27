// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Composer } from "./composer";
import { MESSAGE_MAX } from "./message-schema";

afterEach(cleanup);

const box = () => screen.getByRole("textbox", { name: "Mensaje para el asistente" });

describe("Composer", () => {
  it("sends the trimmed text with Enter and clears the box", async () => {
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    await userEvent.type(box(), "  ¿Cómo está la TRM?  {Enter}");
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("¿Cómo está la TRM?"));
    expect(box()).toHaveValue("");
  });

  it("adds a line with Shift+Enter instead of sending", async () => {
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    await userEvent.type(box(), "uno{Shift>}{Enter}{/Shift}dos");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(box()).toHaveValue("uno\ndos");
  });

  it("does not send an empty message and keeps the button disabled", async () => {
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Enviar mensaje" })).toBeDisabled();
    await userEvent.type(box(), "   {Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("takes the length limit from the message schema", () => {
    render(<Composer onSubmit={() => {}} />);
    expect(box()).toHaveAttribute("maxlength", String(MESSAGE_MAX));
  });

  it("does not send while an answer is on its way", async () => {
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} busy />);
    await userEvent.type(box(), "hola{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Detener respuesta" })).toBeInTheDocument();
  });
});
