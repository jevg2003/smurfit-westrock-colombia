"use client";

import { useCallback, useState } from "react";

/**
 * Values of a screen's select filters. `defaults` is the neutral state; `active` is true as soon as any value
 * differs from it, which is what enables Limpiar.
 */
export function useFilterValues<K extends string>(defaults: Record<K, string>) {
  const [values, setValues] = useState<Record<K, string>>(defaults);
  const [initial] = useState(defaults);

  const set = useCallback((key: K, value: string) => setValues((current) => ({ ...current, [key]: value })), []);
  const clear = useCallback(() => setValues(initial), [initial]);
  const active = (Object.keys(initial) as K[]).some((key) => values[key] !== initial[key]);

  return { values, set, clear, active };
}
