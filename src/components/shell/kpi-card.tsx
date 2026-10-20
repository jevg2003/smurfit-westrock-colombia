import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  label: string;
  value: string;
  note?: string;
}

export function KpiCard({ label, value, note }: Props) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="gap-0 px-4">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
        {note && <CardDescription className="text-xs">{note}</CardDescription>}
      </CardHeader>
    </Card>
  );
}
