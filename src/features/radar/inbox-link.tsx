import Link from "next/link";

/** Where the radar leads next: the TRM detail and the full list of avisos. */
export function InboxLink() {
  return (
    <p>
      Detalle de la TRM en{" "}
      <Link href="/economia?tab=trm" className="underline underline-offset-4 hover:text-foreground">
        Días y variaciones
      </Link>
      . Todos los avisos en{" "}
      <Link href="/resumen?tab=avisos" className="underline underline-offset-4 hover:text-foreground">
        Avisos
      </Link>
      .
    </p>
  );
}
