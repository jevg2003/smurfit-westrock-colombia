// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "@/stores/chat.store";
import { ConversationHistory } from "./conversation-history";

const make = (id: string, title: string, updatedAt: string): Conversation => ({
  id,
  title,
  mode: "page",
  createdAt: updatedAt,
  updatedAt,
  messages: [{ id: `m-${id}`, role: "user", parts: [{ type: "text", text: title }] }],
  feedback: {},
});

const NOW = new Date("2026-10-20T12:00:00.000Z");
const old = make("a", "Contratos de la semana", "2026-10-20T11:00:00.000Z");
const recent = make("b", "TRM del mes", "2026-10-20T11:55:00.000Z");

function setup(props: Partial<React.ComponentProps<typeof ConversationHistory>> = {}) {
  const handlers = { onSelect: vi.fn(), onNew: vi.fn(), onRename: vi.fn(), onDelete: vi.fn() };
  render(<ConversationHistory conversations={[old, recent]} activeId={null} now={NOW} {...handlers} {...props} />);
  return handlers;
}

afterEach(cleanup);

describe("ConversationHistory", () => {
  it("lists conversations latest first with a relative time", () => {
    setup();
    const titles = screen.getAllByRole("button", { name: /^(Contratos de la semana|TRM del mes)$/ }).map((b) => b.textContent);
    expect(titles).toEqual(["TRM del mes", "Contratos de la semana"]);
    expect(screen.getByText("hace 5 minutos")).toBeInTheDocument();
    expect(screen.getByText("hace 1 hora")).toBeInTheDocument();
  });

  it("selects a conversation and marks the active one", async () => {
    const { onSelect } = setup({ activeId: "a" });
    expect(screen.getByRole("button", { name: "Contratos de la semana" })).toHaveAttribute("aria-current", "true");
    await userEvent.click(screen.getByRole("button", { name: "TRM del mes" }));
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("starts a new conversation", async () => {
    const { onNew } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Nueva conversación" }));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("renames inline with Enter and cancels with Escape", async () => {
    const { onRename } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Renombrar: TRM del mes" }));
    const input = screen.getByRole("textbox", { name: "Nuevo nombre" });
    await userEvent.clear(input);
    await userEvent.type(input, "Dólar{Enter}");
    expect(onRename).toHaveBeenCalledWith("b", "Dólar");

    await userEvent.click(screen.getByRole("button", { name: "Renombrar: Contratos de la semana" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Nuevo nombre" }), "x{Escape}");
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("textbox", { name: "Nuevo nombre" })).toBeNull();
  });

  it("asks for confirmation before deleting", async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Borrar: TRM del mes" }));
    expect(onDelete).not.toHaveBeenCalled();
    const confirm = screen.getByRole("group", { name: "Confirmar borrado" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Cancelar" }));
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Borrar: TRM del mes" }));
    await userEvent.click(within(screen.getByRole("group", { name: "Confirmar borrado" })).getByRole("button", { name: "Borrar" }));
    expect(onDelete).toHaveBeenCalledWith("b");
  });

  it("shows an empty state without conversations", () => {
    setup({ conversations: [] });
    expect(screen.getByText("Aún no hay conversaciones")).toBeInTheDocument();
  });
});
