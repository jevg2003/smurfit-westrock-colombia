// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { useCompaniesStore } from "@/stores/companies.store";
import { useHydrationStore } from "@/stores/hydration.store";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }), usePathname: () => "/empresas" }));

import { CompanyPicker } from "./company-picker";

const other = { ...TEST_COMPANY, id: "otra", name: "Otra Empresa", city: undefined };

describe("CompanyPicker", () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    window.localStorage.clear();
    useCompaniesStore.setState({ companies: [TEST_COMPANY, other], activeCompanyId: null });
    useHydrationStore.setState({ hasHydrated: true });
  });
  afterEach(cleanup);

  it("lists the companies and selecting one makes it active and opens the app", async () => {
    render(<CompanyPicker />);
    const list = screen.getByRole("list", { name: "Empresas" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Abrir Otra Empresa" }));
    expect(useCompaniesStore.getState().activeCompanyId).toBe("otra");
    expect(push).toHaveBeenCalledWith("/home");
  });

  it("marks the active company with one badge", () => {
    useCompaniesStore.setState({ activeCompanyId: TEST_COMPANY.id });
    render(<CompanyPicker />);
    expect(screen.getAllByText("Activa")).toHaveLength(1);
  });

  it("sends the user to create a company", async () => {
    render(<CompanyPicker />);
    await userEvent.click(screen.getByRole("button", { name: "Crear nueva empresa" }));
    expect(push).toHaveBeenCalledWith("/onboarding");
  });

  it("deletes a company only after confirming, and removes its saved data", async () => {
    window.localStorage.setItem("swc:otra:alerts:v1", "{}");
    window.localStorage.setItem("swc:otra:onboarding:v1", "{}");
    render(<CompanyPicker />);
    await userEvent.click(screen.getByRole("button", { name: "Acciones de Otra Empresa" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/se borran de este navegador/)).toBeInTheDocument();
    expect(useCompaniesStore.getState().companies).toHaveLength(2);
    await userEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    expect(useCompaniesStore.getState().companies.map((company) => company.id)).toEqual([TEST_COMPANY.id]);
    expect(window.localStorage.getItem("swc:otra:alerts:v1")).toBeNull();
    expect(window.localStorage.getItem("swc:otra:onboarding:v1")).toBeNull();
  });

  it("goes to onboarding when there are no companies left", () => {
    useCompaniesStore.setState({ companies: [], activeCompanyId: null });
    render(<CompanyPicker />);
    expect(replace).toHaveBeenCalledWith("/onboarding");
  });
});
