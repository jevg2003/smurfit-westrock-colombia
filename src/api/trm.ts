import type { TrmRegistro } from "./types";

const TRM_URL = "https://www.datos.gov.co/resource/mcec-87by.json";

export async function fetchTrm(dias = 365): Promise<TrmRegistro[]> {
  const params = new URLSearchParams({
    $order: "vigenciadesde DESC",
    $limit: String(dias),
  });

  const response = await fetch(`${TRM_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`datos.gov.co respondió ${response.status} al consultar la TRM`);
  }
  return response.json();
}

export function urlFuenteTrm(): string {
  return `${TRM_URL}?$order=vigenciadesde DESC&$limit=1`;
}
