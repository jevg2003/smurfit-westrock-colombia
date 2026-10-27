// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { useCompaniesStore } from "@/stores/companies.store";
import { useHydrationStore } from "@/stores/hydration.store";
import { CompanyGate } from "./company-gate";

describe("CompanyGate", () => {
  beforeEach(() => {
    useCompaniesStore.setState({ companies: [], activeCompanyId: null });
    useHydrationStore.setState({ hasHydrated: true });
  });
  afterEach(cleanup);

  it("says there is no company yet instead of rendering the screen", () => {
    render(
      <CompanyGate>
        <p>Contenido</p>
      </CompanyGate>,
    );
    expect(screen.getByText("Todavía no hay una empresa configurada")).toBeInTheDocument();
    expect(screen.queryByText("Contenido")).not.toBeInTheDocument();
  });

  it("waits while the stores load, without flashing the empty state", () => {
    useHydrationStore.setState({ hasHydrated: false });
    render(
      <CompanyGate>
        <p>Contenido</p>
      </CompanyGate>,
    );
    expect(screen.getByRole("status", { name: "Cargando tu empresa" })).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay una empresa configurada")).not.toBeInTheDocument();
  });

  it("renders the screen once a company is active", () => {
    useCompaniesStore.setState({ companies: [TEST_COMPANY], activeCompanyId: TEST_COMPANY.id });
    render(
      <CompanyGate>
        <p>Contenido</p>
      </CompanyGate>,
    );
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });
});
