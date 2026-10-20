import { useState } from "react";
import { escribirStorage, leerStorage } from "../../lib/storage";

const SESION_KEY = "smurfit-trm:sesion";

export const CREDENCIALES_DEMO = { usuario: "analista", clave: "smurfit2026" };

export function useAuth() {
  const [autenticado, setAutenticado] = useState(() => leerStorage(SESION_KEY, false));

  function iniciarSesion(usuario: string, clave: string): boolean {
    const ok = usuario === CREDENCIALES_DEMO.usuario && clave === CREDENCIALES_DEMO.clave;
    if (ok) {
      setAutenticado(true);
      escribirStorage(SESION_KEY, true);
    }
    return ok;
  }

  function cerrarSesion() {
    setAutenticado(false);
    escribirStorage(SESION_KEY, false);
  }

  return { autenticado, iniciarSesion, cerrarSesion };
}
