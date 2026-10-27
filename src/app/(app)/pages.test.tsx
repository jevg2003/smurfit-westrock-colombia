// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { useCompaniesStore } from "@/stores/companies.store";

let query = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/x",
  useSearchParams: () => new URLSearchParams(query),
}));

// Each view is replaced by a marker: these tests are about which tabs a page offers, not the views.
const { stub } = vi.hoisted(() => ({ stub: (name: string) => () => <p>vista {name}</p> }));
vi.mock("@/features/radar/radar-view", () => ({ RadarView: stub("radar") }));
vi.mock("@/features/avisos/avisos-view", () => ({ AvisosView: stub("avisos") }));
vi.mock("@/features/timeline/timeline-view", () => ({ TimelineView: stub("linea") }));
vi.mock("@/features/macro/macro-view", () => ({ MacroView: stub("macro") }));
vi.mock("@/features/trm/dias-view", () => ({ DiasView: stub("trm") }));
vi.mock("@/features/contratacion/contratacion-view", () => ({ ContratacionView: stub("contratacion") }));
vi.mock("@/features/competidores/competidores-view", () => ({ CompetidoresView: stub("competidores") }));
vi.mock("@/features/noticias/noticias-view", () => ({ NoticiasView: stub("noticias") }));
vi.mock("@/features/regulacion/regulacion-view", () => ({ RegulacionView: stub("regulacion") }));
vi.mock("@/features/pestel/pestel-view", () => ({ PestelView: stub("pestel") }));
vi.mock("@/features/briefing/briefing-view", () => ({ BriefingView: stub("briefing") }));
vi.mock("@/features/configuracion/empresa-tab", () => ({ EmpresaTab: stub("empresa") }));
vi.mock("@/features/configuracion/reglas-tab", () => ({ ReglasTab: stub("reglas") }));
vi.mock("@/features/fuentes/fuentes-view", () => ({ FuentesView: stub("fuentes") }));
vi.mock("@/features/acerca/acerca-view", () => ({ AcercaView: stub("acerca") }));

import AnalisisPage from "./analisis/page";
import ConfiguracionPage from "./configuracion/page";
import EconomiaPage from "./economia/page";
import NoticiasPage from "./noticias/page";
import ResumenPage from "./resumen/page";

const tabNames = () => screen.getAllByRole("tab").map((tab) => tab.textContent);

describe("pages with tabs", () => {
  beforeEach(() => {
    query = "";
    useCompaniesStore.setState({ companies: [TEST_COMPANY], activeCompanyId: TEST_COMPANY.id });
  });
  afterEach(cleanup);

  it("Resumen: Radar, Avisos, Línea de tiempo", () => {
    render(<ResumenPage />);
    expect(tabNames()).toEqual(["Radar", "Avisos", "Línea de tiempo"]);
    expect(screen.getByText("vista radar")).toBeInTheDocument();
  });

  it("Noticias: Noticias, Regulación", () => {
    render(<NoticiasPage />);
    expect(tabNames()).toEqual(["Noticias", "Regulación"]);
  });

  it("Análisis: PESTEL, Briefing", () => {
    render(<AnalisisPage />);
    expect(tabNames()).toEqual(["PESTEL", "Briefing"]);
  });

  it("Configuración: Empresa, Reglas y preferencias, Fuentes, Acerca", () => {
    render(<ConfiguracionPage />);
    expect(tabNames()).toEqual(["Empresa", "Reglas y preferencias", "Fuentes", "Acerca de"]);
  });

  describe("Economía", () => {
    it("offers Macro, TRM, Contratación and Competidores when the company has a NIT", () => {
      render(<EconomiaPage />);
      expect(tabNames()).toEqual(["Macro", "TRM", "Contratación", "Competidores"]);
    });

    it("hides Contratación and Competidores without a NIT, even if the URL asks for one", () => {
      const { nit: _nit, ...withoutNit } = TEST_COMPANY;
      useCompaniesStore.setState({ companies: [withoutNit], activeCompanyId: withoutNit.id });
      query = "tab=contratacion";
      render(<EconomiaPage />);
      expect(tabNames()).toEqual(["Macro", "TRM"]);
      expect(screen.getByText("vista macro")).toBeInTheDocument();
      expect(screen.queryByText("vista contratacion")).not.toBeInTheDocument();
    });
  });
});
