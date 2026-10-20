import { useCallback, useState } from "react";
import { escribirStorage, leerStorage } from "../../lib/storage";

const ALERTAS_KEY = "smurfit-trm:alertas";

export function useAlertas() {
  const [idsGuardados, setIdsGuardados] = useState<string[]>(() =>
    leerStorage<string[]>(ALERTAS_KEY, []),
  );

  const alternar = useCallback((id: string) => {
    setIdsGuardados((actual) => {
      const siguiente = actual.includes(id)
        ? actual.filter((guardado) => guardado !== id)
        : [...actual, id];
      escribirStorage(ALERTAS_KEY, siguiente);
      return siguiente;
    });
  }, []);

  const estaGuardado = useCallback(
    (id: string) => idsGuardados.includes(id),
    [idsGuardados],
  );

  return { idsGuardados, alternar, estaGuardado };
}
