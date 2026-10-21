import Link from "next/link";

/** Where the radar leads next: the TRM detail and the full signal list. */
export function InboxLink() {
  return (
    <p>
      Detalle de la TRM en{" "}
      <Link href="/dias" className="underline underline-offset-4 hover:text-foreground">
        Días y variaciones
      </Link>
      . Todas las señales en{" "}
      <Link href="/senales" className="underline underline-offset-4 hover:text-foreground">
        Señales
      </Link>
      .
    </p>
  );
}
