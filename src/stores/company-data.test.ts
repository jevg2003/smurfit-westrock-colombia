// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { useCompaniesStore } from "./companies.store";
import { deleteCompany, removeCompanyData } from "./company-data";
import { createMemoryStorage } from "./test-utils";

const other = { ...TEST_COMPANY, id: "otra", name: "Otra Empresa" };

describe("company data removal", () => {
  it("removes every key of one company and keeps the rest", () => {
    const storage = createMemoryStorage({
      "swc:empresa-ejemplo:alerts:v1": "{}",
      "swc:empresa-ejemplo:onboarding:v1": "{}",
      "swc:otra:alerts:v1": "{}",
      "swc:empresa-ejemplo-2:alerts:v1": "{}",
      "swc:companies:v1": "{}",
    });
    removeCompanyData("empresa-ejemplo", storage, () => [...storage.data.keys()]);
    expect([...storage.data.keys()].sort()).toEqual(["swc:companies:v1", "swc:empresa-ejemplo-2:alerts:v1", "swc:otra:alerts:v1"]);
  });

  describe("deleteCompany", () => {
    beforeEach(() => {
      useCompaniesStore.setState({ companies: [TEST_COMPANY, other], activeCompanyId: other.id });
      window.localStorage.clear();
    });

    it("drops the profile, its saved data and the active company when it was this one", () => {
      window.localStorage.setItem("swc:otra:alerts:v1", "{}");
      window.localStorage.setItem("swc:otra:onboarding:v1", "{}");
      window.localStorage.setItem("swc:empresa-ejemplo:alerts:v1", "{}");
      deleteCompany("otra");
      expect(useCompaniesStore.getState().companies.map((company) => company.id)).toEqual([TEST_COMPANY.id]);
      expect(useCompaniesStore.getState().activeCompanyId).toBeNull();
      expect(window.localStorage.getItem("swc:otra:alerts:v1")).toBeNull();
      expect(window.localStorage.getItem("swc:otra:onboarding:v1")).toBeNull();
      expect(window.localStorage.getItem("swc:empresa-ejemplo:alerts:v1")).not.toBeNull();
    });
  });
});
