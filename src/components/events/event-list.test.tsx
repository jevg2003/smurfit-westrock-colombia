// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EventList } from "./event-list";

afterEach(cleanup);

const NOW = new Date("2026-10-27T15:00:00.000Z");
const items = [
  { id: "a", at: "2026-10-27T13:00:00.000Z", title: "Primero" },
  { id: "b", at: "2026-10-26T13:00:00.000Z", title: "Segundo" },
  { id: "c", at: "2026-10-27T11:00:00.000Z", title: "Tercero" },
];

describe("EventList", () => {
  it("groups items under day headings and keeps one list per day", () => {
    render(<EventList label="Avisos" items={items} now={NOW} getKey={(item) => item.id} renderItem={(item) => <li>{item.title}</li>} />);

    expect(screen.getByRole("heading", { name: "Hoy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ayer" })).toBeInTheDocument();
    const today = screen.getByRole("list", { name: "Avisos: Hoy" });
    expect(within(today).getAllByRole("listitem").map((node) => node.textContent)).toEqual(["Primero", "Tercero"]);
  });

  it("makes the day headings sticky inside the scrolling region", () => {
    render(<EventList label="Avisos" items={items} now={NOW} getKey={(item) => item.id} renderItem={(item) => <li>{item.title}</li>} />);

    expect(screen.getByRole("heading", { name: "Hoy" }).className).toContain("sticky");
    expect(screen.getByRole("heading", { name: "Hoy" }).className).toContain("top-0");
  });

  it("keeps the given order in one list when it is flat", () => {
    render(<EventList flat label="Noticias" items={items} now={NOW} getKey={(item) => item.id} renderItem={(item) => <li>{item.title}</li>} />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Noticias" })).getAllByRole("listitem").map((node) => node.textContent)).toEqual(["Primero", "Segundo", "Tercero"]);
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<EventList label="Avisos" items={[]} getKey={() => ""} renderItem={() => null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
