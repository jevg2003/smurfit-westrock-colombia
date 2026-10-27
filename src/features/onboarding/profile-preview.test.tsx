// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { OnboardingDraft } from "@/core/onboarding/draft";
import { ProfilePreview } from "./profile-preview";

afterEach(cleanup);

const draft = (patch: OnboardingDraft["patch"] = {}, seed: OnboardingDraft["seed"] = { name: "Acme SAS", city: "Cali" }): OnboardingDraft => ({
  seed,
  stage: "questions",
  questions: [],
  answers: {},
  cursor: 0,
  blocksDone: { empresa: false, objetivos: false },
  patch,
  updatedAt: "2026-10-27T10:00:00.000Z",
});

const pendingBars = (container: HTMLElement) => container.querySelectorAll('[data-state="pending"]');

describe("ProfilePreview window", () => {
  it("renders skeleton bars for everything that is not known yet", () => {
    const { container } = render(<ProfilePreview draft={draft({}, null)} />);
    expect(pendingBars(container).length).toBeGreaterThan(10);
    expect(screen.getByText("Su empresa", { exact: false })).toBeInTheDocument();
    for (const heading of ["Actividad", "Competidores", "Noticias del sector", "Regulación", "Objetivos"]) {
      expect(screen.getByText(heading, { selector: "p" })).toBeInTheDocument();
    }
  });

  it("shows the company name and the sector badge once they are known", () => {
    render(<ProfilePreview draft={draft({ sector: "Lácteos" })} />);
    expect(screen.getByText("Acme SAS")).toBeInTheDocument();
    expect(screen.getByText("Lácteos")).toBeInTheDocument();
  });

  it("swaps the skeleton of a row for its real values without touching the other rows", () => {
    const before = render(<ProfilePreview draft={draft()} />);
    const barsBefore = pendingBars(before.container).length;
    before.unmount();

    const { container } = render(<ProfilePreview draft={draft({ competitors: [{ name: "Alpina", nit: "860025900" }, { name: "Colanta" }] })} />);
    expect(screen.getAllByText("Alpina").length).toBeGreaterThan(0);
    expect(screen.getByText("Colanta", { selector: "span.block" })).toBeInTheDocument();
    expect(pendingBars(container).length).toBeLessThan(barsBefore);
    const row = screen.getByText("Competidores", { selector: "p" }).closest("li") as HTMLElement;
    expect(within(row).getByText("1 con NIT para consultar contratos")).toBeInTheDocument();
    const goalsRow = screen.getByText("Objetivos", { selector: "p" }).closest("li") as HTMLElement;
    expect(goalsRow.querySelectorAll('[data-state="pending"]').length).toBeGreaterThan(0);
  });

  it("fades values in only through the reduced-motion aware classes", () => {
    render(<ProfilePreview draft={draft({ activity: "Produce leche." })} />);
    expect(screen.getByText("Produce leche.").className).toContain("motion-reduce:animate-none");
  });
});

describe("ProfilePreview list", () => {
  it("invites the user to answer while nothing is known", () => {
    render(<ProfilePreview draft={draft({}, null)} variant="list" />);
    expect(screen.getByText(/A medida que responda/)).toBeInTheDocument();
  });

  it("lists only what is known", () => {
    render(<ProfilePreview draft={draft({ goals: { target: "Exportar", priorities: ["Costos"] } })} variant="list" />);
    expect(screen.getByText("Objetivos")).toBeInTheDocument();
    expect(screen.getByText("Exportar")).toBeInTheDocument();
    expect(screen.getByText("Costos")).toBeInTheDocument();
    expect(screen.queryByText("Competidores")).not.toBeInTheDocument();
  });
});
