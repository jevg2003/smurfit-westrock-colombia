"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/lib/use-local-storage";

const ALERTAS_KEY = "smurfit-trm:alertas";
const SIN_ALERTAS: string[] = [];

export function useAlertas() {
  const [ids, setIds] = useLocalStorage<string[]>(ALERTAS_KEY, SIN_ALERTAS);

  const alternar = useCallback(
    (id: string) =>
      setIds((actual) => (actual.includes(id) ? actual.filter((guardado) => guardado !== id) : [...actual, id])),
    [setIds],
  );

  const estaGuardado = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, alternar, estaGuardado };
}
