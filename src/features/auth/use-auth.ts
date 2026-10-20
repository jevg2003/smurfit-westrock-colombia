"use client";

import { useCallback } from "react";
import { useHydrated, useLocalStorage } from "@/lib/use-local-storage";

const SESION_KEY = "smurfit-trm:sesion";

export const CREDENCIALES_DEMO = { usuario: "analista", clave: "smurfit2026" };

export function useAuth() {
  const listo = useHydrated();
  const [autenticado, setAutenticado] = useLocalStorage(SESION_KEY, false);

  const iniciarSesion = useCallback(
    (usuario: string, clave: string): boolean => {
      const ok = usuario === CREDENCIALES_DEMO.usuario && clave === CREDENCIALES_DEMO.clave;
      if (ok) setAutenticado(true);
      return ok;
    },
    [setAutenticado],
  );

  const cerrarSesion = useCallback(() => setAutenticado(false), [setAutenticado]);

  return { listo, autenticado, iniciarSesion, cerrarSesion };
}
