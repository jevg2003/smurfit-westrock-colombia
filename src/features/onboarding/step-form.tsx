import { useStore, type AnyFormApi } from "@tanstack/react-form";
import type { ComponentProps, ReactNode } from "react";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface StepFormProps extends Omit<ComponentProps<"form">, "children"> {
  children: ReactNode;
  /** The Back, Skip and Continue row; it stays at the bottom of the form while the content scrolls above it. Nothing renders when it is null. */
  actions: ReactNode;
  /** Padding around content and actions. Turn it off when a section already pads the form (Configuración). */
  inset?: boolean;
  /** Spacing between the blocks of the content. */
  contentClassName?: string;
}

/**
 * Layout of every step: the content takes the room that is left and scrolls on its own when the column has a
 * fixed height (wide screens), and the actions are anchored below it, so they never move when the content
 * grows or the space is short. Without a fixed height the form grows and the actions stick to the viewport bottom.
 */
export function StepForm({ children, actions, inset = true, contentClassName, className, ...props }: StepFormProps) {
  return (
    <form noValidate className={cn("flex min-h-0 flex-1 flex-col", className)} {...props}>
      {/* Base UI's viewport takes its height from the root, so the root is a flex item (flex-1 min-h-0) of a column with
          a definite height on wide screens. Below lg the root has no height to fill: the viewport grows with the
          content and the page scrolls, with no nested scroll. */}
      <ScrollArea className="min-h-0 flex-1">
        <div className={cn("flex min-h-full flex-col gap-5", inset && "px-4 py-4", contentClassName)}>{children}</div>
      </ScrollArea>
      {actions !== null && (
        <div className={cn("sticky bottom-0 z-10 mt-auto shrink-0 border-t bg-card py-3", inset ? "px-4" : "mt-4")}>{actions}</div>
      )}
    </form>
  );
}

interface FormIssuesProps {
  form: AnyFormApi;
  schema: z.ZodType;
  /** Names the part of the form an issue points at, so a bare message ("Use 120 caracteres...") has a place. */
  labelOf?(path: readonly PropertyKey[]): string | undefined;
}

const pathName = (path: readonly PropertyKey[]) =>
  path.reduce<string>((name, segment) => (typeof segment === "number" ? `${name}[${segment}]` : name ? `${name}.${String(segment)}` : String(segment)), "");

/**
 * After a failed save, lists the schema issues that no field shows (an item of a list has no field of its own),
 * so a blocked save never looks like a button that does nothing.
 */
export function FormIssues({ form, schema, labelOf }: FormIssuesProps) {
  const attempts = useStore(form.store, (state) => state.submissionAttempts);
  const values = useStore(form.store, (state) => state.values);
  // Subscribing to the metas re-renders this when a field's errors change.
  useStore(form.store, (state) => state.fieldMeta);
  if (attempts === 0) return null;
  const parsed = schema.safeParse(values);
  if (parsed.success) return null;
  const hidden = parsed.error.issues.filter((issue) => {
    // A field that is mounted shows its own error; an item of a list or a part of a row has no field.
    return !form.fieldInfo[pathName(issue.path)]?.instance;
  });
  if (hidden.length === 0) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>No se pudo guardar</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {hidden.map((issue, index) => {
            const label = labelOf?.(issue.path);
            return (
              <li key={`${pathName(issue.path)}-${index}`}>
                {label ? `${label}: ` : ""}
                {issue.message}
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
