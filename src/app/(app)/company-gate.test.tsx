// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { useCompaniesStore } from "@/stores/companies.store";
import { useHydrationStore } from "@/stores/hydration.store";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

import { CompanyGate } from "./company-gate";

const renderGate = () =>
  render(
    <CompanyGate>
      <p>Contenido</p>
    </CompanyGate>,
  );

describe("CompanyGate", () => {
  beforeEach(() => {
    replace.mockClear();
    useCompaniesStore.setState({ companies: [], activeCompanyId: null });
    useHydrationStore.setState({ hasHydrated: true });
  });
  afterEach(cleanup);

  it("sends the user to the onboarding when no company exists", () => {
    renderGate();
    expect(replace).toHaveBeenCalledWith("/onboarding");
    expect(screen.queryByText("Contenido")).not.toBeInTheDocument();
  });

  it("sends the user to the picker when companies exist but none is active", () => {
    useCompaniesStore.setState({ companies: [TEST_COMPANY], activeCompanyId: null });
    renderGate();
    expect(replace).toHaveBeenCalledWith("/empresas");
    expect(screen.queryByText("Contenido")).not.toBeInTheDocument();
  });

  it("waits while the stores load, without redirecting", () => {
    useHydrationStore.setState({ hasHydrated: false });
    renderGate();
    expect(screen.getByRole("status", { name: "Cargando tu empresa" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders the screen once a company is active", () => {
    useCompaniesStore.setState({ companies: [TEST_COMPANY], activeCompanyId: TEST_COMPANY.id });
    renderGate();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
