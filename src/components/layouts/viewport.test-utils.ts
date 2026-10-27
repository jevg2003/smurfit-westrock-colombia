import { vi } from "vitest";

/** Makes `matchMedia` answer `(min-width: Npx)` and `(max-width: Npx)` queries for a viewport of `width` pixels. */
export function mockViewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /max-width:\s*(\d+)px/.exec(query);
    const matches = (min ? width >= Number(min[1]) : true) && (max ? width <= Number(max[1]) : true);
    return { matches, media: query, addEventListener: () => {}, removeEventListener: () => {} };
  });
}
