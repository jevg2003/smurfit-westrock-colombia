// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useCompaniesStore } from "@/stores/companies.store";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }), usePathname: () => "/economia" }));

import { CompanySwitcher } from "./company-switcher";

beforeAll(() => {
  // jsdom has no matchMedia; the sidebar reads it to detect mobile.
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
});

const other = { ...TEST_COMPANY, id: "otra", name: "Otra Empresa" };

function renderSwitcher() {
  render(
    <SidebarProvider>
      <CompanySwitcher />
    </SidebarProvider>,
  );
}

describe("CompanySwitcher", () => {
  beforeEach(() => {
    push.mockClear();
    useCompaniesStore.setState({ companies: [TEST_COMPANY, other], activeCompanyId: TEST_COMPANY.id });
  });
  afterEach(cleanup);

  it("shows the active company and switches to another without leaving the page", async () => {
    renderSwitcher();
    await userEvent.click(screen.getByRole("button", { name: /Empresa Ejemplo/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Otra Empresa/ }));
    expect(useCompaniesStore.getState().activeCompanyId).toBe("otra");
    expect(push).not.toHaveBeenCalled();
  });

  it("links to create a company and to see them all", async () => {
    renderSwitcher();
    await userEvent.click(screen.getByRole("button", { name: /Empresa Ejemplo/ }));
    expect(await screen.findByRole("menuitem", { name: "Nueva empresa" })).toHaveAttribute("href", "/onboarding?nueva=1");
    expect(screen.getByRole("menuitem", { name: "Ver todas las empresas" })).toHaveAttribute("href", "/empresas");
  });

  it("signs out by clearing the active company and opening the picker", async () => {
    renderSwitcher();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(useCompaniesStore.getState().activeCompanyId).toBeNull();
    expect(useCompaniesStore.getState().companies).toHaveLength(2);
    expect(push).toHaveBeenCalledWith("/empresas");
  });
});
