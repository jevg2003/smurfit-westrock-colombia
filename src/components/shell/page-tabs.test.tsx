// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BellIcon, RadarIcon } from "lucide-react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
let query = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/resumen",
  useSearchParams: () => new URLSearchParams(query),
}));

import { PageTabs, type PageTab } from "./page-tabs";

const mounted = vi.fn();
function Probe({ name }: { name: string }) {
  useEffect(() => mounted(name), [name]);
  return <p>Contenido {name}</p>;
}

const tabs = (overrides: Partial<Record<string, boolean>> = {}): PageTab[] => [
  { value: "radar", label: "Radar", icon: RadarIcon, content: <Probe name="radar" /> },
  { value: "avisos", label: "Avisos", icon: BellIcon, content: <Probe name="avisos" />, hidden: overrides.avisos },
  { value: "otro", label: "Otro", icon: BellIcon, content: <Probe name="otro" /> },
];

describe("PageTabs", () => {
  beforeEach(() => {
    query = "";
    push.mockClear();
    mounted.mockClear();
  });
  afterEach(cleanup);

  it("renders the page title as the only h1", () => {
    render(<PageTabs title="Resumen" tabs={tabs()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Resumen" })).toBeInTheDocument();
  });

  it("opens the first visible tab when the URL has none", () => {
    render(<PageTabs title="Resumen" tabs={tabs()} />);
    expect(screen.getByRole("tab", { name: "Radar" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Contenido radar")).toBeInTheDocument();
  });

  it("opens the tab named by ?tab=", () => {
    query = "tab=otro";
    render(<PageTabs title="Resumen" tabs={tabs()} />);
    expect(screen.getByRole("tab", { name: "Otro" })).toHaveAttribute("aria-selected", "true");
  });

  it("falls back to the first tab when ?tab= is unknown", () => {
    query = "tab=nada";
    render(<PageTabs title="Resumen" tabs={tabs()} />);
    expect(screen.getByRole("tab", { name: "Radar" })).toHaveAttribute("aria-selected", "true");
  });

  it("writes the chosen tab to the URL with a history entry", async () => {
    render(<PageTabs title="Resumen" tabs={tabs()} />);
    await userEvent.click(screen.getByRole("tab", { name: "Avisos" }));
    expect(push).toHaveBeenCalledWith("/resumen?tab=avisos", { scroll: false });
  });

  it("renders only the active tab content", () => {
    render(<PageTabs title="Resumen" tabs={tabs()} />);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(mounted).toHaveBeenCalledWith("radar");
    expect(screen.queryByText("Contenido avisos")).not.toBeInTheDocument();
  });

  it("shows nothing for a hidden tab, even if the URL asks for it", () => {
    query = "tab=avisos";
    render(<PageTabs title="Resumen" tabs={tabs({ avisos: true })} />);
    expect(screen.queryByRole("tab", { name: "Avisos" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Radar" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("keeps the bar at its content width, scrolling sideways with no scrollbar and never vertically", () => {
    render(<PageTabs title="Resumen" tabs={tabs()} />);
    const bar = screen.getByRole("tablist");
    for (const name of ["max-w-full", "overflow-x-auto", "overflow-y-hidden", "scrollbar-none"]) expect(bar).toHaveClass(name);
    expect(bar).not.toHaveClass("w-full");
    for (const tab of screen.getAllByRole("tab")) expect(tab).not.toHaveClass("sm:flex-1");
  });
});
