import { formatHoraBogota } from "@/lib/date";

interface Props {
  attribution: string;
  license: string;
  /** ISO instant or epoch milliseconds of the last successful read. */
  fetchedAt?: string | number;
  /** Extra clause, for example the window the data covers. */
  extra?: string;
}

/** One line with the source, license and date of the data on a card (RF-13). */
export function ProvenanceNote({ attribution, license, fetchedAt, extra }: Props) {
  const date = fetchedAt === undefined ? undefined : formatHoraBogota(new Date(fetchedAt).toISOString());
  return (
    <p className="text-xs text-muted-foreground">
      {attribution} · {license}
      {date ? ` · Consultado: ${date}` : ""}
      {extra ? ` · ${extra}` : ""}
    </p>
  );
}
