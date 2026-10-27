import type { ReactNode } from "react";
import type { z } from "zod";
import { Badge } from "@/components/reui/badge";
import { fieldMeta } from "@/lib/schema-meta";

interface ConfirmSectionProps {
  title: string;
  description: string;
  /** Schema of the form and the paths of the fields of this section; the badge reads "required" from them. */
  schema: z.ZodType;
  paths: readonly string[];
  /** Sits at the right of the header (a count, an add button). */
  action?: ReactNode;
  children: ReactNode;
}

/** A titled block of the confirm form. Its badge says "Obligatorio" when the schema requires any of its fields. */
export function ConfirmSection({ title, description, schema, paths, action, children }: ConfirmSectionProps) {
  const required = paths.some((path) => fieldMeta(schema, path).required);
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{title}</h2>
            <Badge data-testid="section-badge" variant={required ? "success-light" : "secondary"} size="sm">
              {required ? "Obligatorio" : "Opcional"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
