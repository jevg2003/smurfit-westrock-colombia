import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  etiqueta: string;
  valor: string;
  nota?: string;
}

export function KpiCard({ etiqueta, valor, nota }: Props) {
  return (
    <Card className="py-4 gap-1">
      <CardHeader className="gap-0 px-4">
        <CardDescription>{etiqueta}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{valor}</CardTitle>
        {nota && <CardDescription className="text-xs">{nota}</CardDescription>}
      </CardHeader>
    </Card>
  );
}
