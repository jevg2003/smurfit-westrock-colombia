import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StepFormProps extends Omit<ComponentProps<"form">, "children"> {
  children: ReactNode;
  /** The Back, Skip and Continue row; it stays at the bottom of the form while the content scrolls above it. */
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
      <div className={cn("flex min-h-0 flex-1 flex-col gap-5 lg:overflow-y-auto", inset && "px-4 py-4", contentClassName)}>{children}</div>
      <div className={cn("sticky bottom-0 z-10 mt-auto shrink-0 border-t bg-card py-3", inset ? "px-4" : "mt-4")}>{actions}</div>
    </form>
  );
}
