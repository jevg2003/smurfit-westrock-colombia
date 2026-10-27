import Link from "next/link";
import type { ReactNode } from "react";
import { PageIntro } from "@/components/shell/page-intro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_THRESHOLDS } from "@/core/company/defaults";

const linkClass = "underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size="sm">
      <CardHeader>
        <h2>
          <CardTitle>{title}</CardTitle>
        </h2>
      </CardHeader>
      <CardContent className="flex max-w-prose flex-col gap-2 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

/** What the tool is, how it computes signals, how the AI is used, data licenses and privacy. */
export function AcercaView() {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageIntro title="Acerca de" description="Qué es esta herramienta, de dónde salen sus datos y qué puedes esperar de ella." />

      <Section title="Qué es y qué no es">
        <p>
          Smart Work Core (SWC) lee el contexto de Colombia para que una empresa decida con datos: junta en un solo lugar la TRM, la contratación pública, la macroeconomía, los
          competidores, las noticias, la regulación y la energía, y las convierte en señales fáciles de revisar. Cada empresa tiene su propia configuración.
        </p>
        <p className="font-medium text-foreground">Es una herramienta independiente, sin relación ni aval de las entidades que publican los datos.</p>
        <p>
          No es una fuente oficial, no da asesoría financiera, legal ni de compras, y no reemplaza revisar el dato original. Cada señal enlaza al registro de donde salió para que puedas
          comprobarlo.
        </p>
      </Section>

      <Section title="Cómo se calculan las señales">
        <p>
          Las señales salen de reglas escritas, con umbrales visibles. No hay un puntaje opaco. Por ejemplo, un día de TRM es atípico si se mueve al menos {DEFAULT_THRESHOLDS.trmDailyMovePct}%
          frente al día anterior, y pasa a alerta desde {DEFAULT_THRESHOLDS.trmDailyAlertPct}%. Un contrato entra en vigilancia cuando vence en {DEFAULT_THRESHOLDS.contractExpiryWatchDays} días
          o menos, y en alerta a los {DEFAULT_THRESHOLDS.contractExpiryAlertDays}.
        </p>
        <p>
          Puedes cambiar los umbrales y los términos de noticias en{" "}
          <Link href="/preferencias" className={linkClass}>
            Preferencias
          </Link>
          . Los cambios se guardan solo en tu navegador.
        </p>
      </Section>

      <Section title="Cómo se usa la IA">
        <p>
          El asistente lee los datos de la aplicación y, si lo activas, busca en internet. Puede equivocarse, así que revisa siempre las fuentes que cita antes de usar una cifra. Las reglas que
          producen las señales no usan IA.
        </p>
        <p>
          La clave del proveedor vive solo en el servidor y nunca llega al navegador. Puedes ver si el asistente está configurado en{" "}
          <Link href="/fuentes" className={linkClass}>
            Fuentes
          </Link>
          .
        </p>
      </Section>

      <Section title="Licencias de los datos">
        <ul className="flex list-disc flex-col gap-1 ps-5">
          <li>datos.gov.co (TRM, SECOP II, Supersociedades, exportaciones y decretos): CC BY-SA 4.0, con atribución a cada entidad.</li>
          <li>Banco Mundial (PIB e inflación): CC BY 4.0.</li>
          <li>XM (energía eléctrica): sin licencia abierta declarada. Se muestra con atribución y enlace.</li>
          <li>Medios colombianos y Minambiente: solo titular, fecha y enlace; los derechos son de cada medio y entidad.</li>
          <li>Google News: términos de uso personal y no comercial. Es un riesgo conocido y aceptado.</li>
        </ul>
      </Section>

      <Section title="Privacidad">
        <p>
          Todo lo que guardas (alertas, seguimiento, preferencias y conversaciones con el asistente) queda en tu navegador. No hay cuenta ni inicio de sesión, y no usamos analítica ni
          seguimiento.
        </p>
        <p>
          Ley 1581 de 2012: la aplicación no recolecta datos personales. Lo que escribes se queda en tu navegador; solo el texto de tus preguntas al asistente viaja al proveedor de IA para
          generar la respuesta.
        </p>
      </Section>
    </div>
  );
}
