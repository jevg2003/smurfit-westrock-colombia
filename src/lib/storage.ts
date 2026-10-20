export function leerStorage<T>(clave: string, valorPorDefecto: T): T {
  try {
    const crudo = window.localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : valorPorDefecto;
  } catch {
    return valorPorDefecto;
  }
}

export function escribirStorage<T>(clave: string, valor: T): void {
  window.localStorage.setItem(clave, JSON.stringify(valor));
}
