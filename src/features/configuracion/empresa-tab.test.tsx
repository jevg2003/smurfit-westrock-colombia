// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatNit } from "@/core/company/nit";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { useCompaniesStore } from "@/stores/companies.store";
import { useHydrationStore } from "@/stores/hydration.store";
import { useOnboardingDraftStore } from "@/stores/onboarding-draft.store";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { EmpresaTab } from "./empresa-tab";

const section = () => screen.getByRole("region", { name: "Empresa" });

describe("EmpresaTab", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
    useCompaniesStore.setState({ companies: [TEST_COMPANY], activeCompanyId: TEST_COMPANY.id });
    useOnboardingDraftStore.setState({ draft: null });
    useHydrationStore.setState({ hasHydrated: true });
  });
  afterEach(cleanup);

  it("shows the active company profile in the shared form", () => {
    render(<EmpresaTab />);
    expect(within(section()).getByRole("textbox", { name: "Nombre de la empresa" })).toHaveValue(TEST_COMPANY.name);
    expect(within(section()).getByRole("textbox", { name: "NIT" })).toHaveValue(formatNit(TEST_COMPANY.nit!));
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("saves the edits to the same company and confirms", async () => {
    render(<EmpresaTab />);
    const name = within(section()).getByRole("textbox", { name: "Nombre de la empresa" });
    await userEvent.clear(name);
    await userEvent.type(name, "Empresa Renovada");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(useCompaniesStore.getState().companies[0].name).toBe("Empresa Renovada"));
    expect(useCompaniesStore.getState().companies).toHaveLength(1);
    expect(useCompaniesStore.getState().companies[0]).toMatchObject({ id: TEST_COMPANY.id, thresholds: TEST_COMPANY.thresholds });
    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
  });

  it("rejects an invalid NIT without touching the company", async () => {
    render(<EmpresaTab />);
    const nit = within(section()).getByRole("textbox", { name: "NIT" });
    await userEvent.clear(nit);
    await userEvent.type(nit, "12");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText(/entre 5 y 10 dígitos/)).toBeInTheDocument();
    expect(useCompaniesStore.getState().companies[0].nit).toBe(TEST_COMPANY.nit);
  });

  it("re-answers the onboarding for this company, prefilled", async () => {
    render(<EmpresaTab />);
    await userEvent.click(screen.getByRole("button", { name: "Volver a responder el onboarding" }));
    expect(useOnboardingDraftStore.getState().draft).toMatchObject({ companyId: TEST_COMPANY.id, seed: { name: TEST_COMPANY.name } });
    expect(push).toHaveBeenCalledWith("/onboarding");
  });

  it("asks before replacing an onboarding left in progress", async () => {
    useOnboardingDraftStore.getState().start();
    useOnboardingDraftStore.getState().saveSeed({ name: "Otra a medias" });
    render(<EmpresaTab />);
    await userEvent.click(screen.getByRole("button", { name: "Volver a responder el onboarding" }));
    expect(push).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole("button", { name: "Reemplazar" }));
    expect(useOnboardingDraftStore.getState().draft?.companyId).toBe(TEST_COMPANY.id);
    expect(push).toHaveBeenCalledWith("/onboarding");
  });
});
