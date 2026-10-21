import type { PublicContract } from "../domain/contract";

/** Builds a contract for rule tests (dates are Bogota midnight ISO strings). */
export function makeContract(overrides: Partial<PublicContract> = {}): PublicContract {
  return {
    id: "CO1.PCCNTR.1",
    entity: "INDUSTRIA LICORERA DEL CAUCA",
    supplierNit: "890300406",
    supplierName: "CARTON DE COLOMBIA S.A.",
    value: 807534110,
    signedAt: "2026-01-27T00:00:00.000-05:00",
    endsAt: "2026-12-31T00:00:00.000-05:00",
    status: "Modificado",
    processUrl: "https://community.secop.gov.co/process/1",
    provenance: {
      sourceId: "secop",
      url: "https://www.datos.gov.co/resource/jbjy-vk9h.json?id_contrato=CO1.PCCNTR.1",
      fetchedAt: "2026-10-20T15:00:00.000Z",
      license: "CC BY-SA 4.0",
      attribution: "Agencia Nacional de Contratación Pública - Colombia Compra Eficiente vía datos.gov.co",
    },
    ...overrides,
  };
}

export const fixedClock = (iso: string) => ({ now: () => new Date(iso) });
