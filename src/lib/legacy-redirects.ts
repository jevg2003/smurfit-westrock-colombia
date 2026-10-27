/**
 * Routes of the 17-item navigation, now tabs of five pages. They redirect permanently so bookmarks and
 * shared links keep working. A plain module with no aliases: `next.config.ts` imports it.
 */
export interface LegacyRedirect {
  source: string;
  destination: string;
  permanent: true;
}

const redirect = (source: string, destination: string): LegacyRedirect => ({ source, destination, permanent: true });

export const LEGACY_REDIRECTS: readonly LegacyRedirect[] = [
  redirect("/home", "/resumen?tab=radar"),
  redirect("/senales", "/resumen?tab=avisos"),
  redirect("/alertas", "/resumen?tab=avisos"),
  redirect("/linea-de-tiempo", "/resumen?tab=linea-de-tiempo"),
  redirect("/seguimiento", "/configuracion?tab=reglas"),
  redirect("/macro", "/economia?tab=macro"),
  redirect("/dias", "/economia?tab=trm"),
  redirect("/contratacion", "/economia?tab=contratacion"),
  redirect("/competidores", "/economia?tab=competidores"),
  redirect("/regulacion", "/noticias?tab=regulacion"),
  redirect("/pestel", "/analisis?tab=pestel"),
  redirect("/briefing", "/analisis?tab=briefing"),
  redirect("/preferencias", "/configuracion?tab=reglas"),
  redirect("/fuentes", "/configuracion?tab=fuentes"),
  redirect("/acerca", "/configuracion?tab=acerca"),
];

/** Where an old route now lives, or undefined when the path is not a legacy one. */
export const legacyDestination = (path: string): string | undefined => LEGACY_REDIRECTS.find((item) => item.source === path)?.destination;
