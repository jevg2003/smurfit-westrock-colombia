import type { Provenance } from "./provenance";

export interface PublicContract {
  id: string;
  entity: string;
  department?: string;
  supplierNit: string;
  supplierName: string;
  value: number;
  signedAt: string;
  endsAt?: string;
  status: string;
  processUrl?: string;
  provenance: Provenance;
}
