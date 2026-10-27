import type { ComponentProps, ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      {/* Base UI's viewport takes its height from the root, so the root is a flex item (flex-1 min-h-0) of a column with
          a definite height on wide screens. Below lg the root has no height to fill: the viewport grows with the
          content and the page scrolls, with no nested scroll. */}
      <ScrollArea className="min-h-0 flex-1">
        <div className={cn("flex min-h-full flex-col gap-5", inset && "px-4 py-4", contentClassName)}>{children}</div>
      </ScrollArea>
      <div className={cn("sticky bottom-0 z-10 mt-auto shrink-0 border-t bg-card py-3", inset ? "px-4" : "mt-4")}>{actions}</div>
    </form>
  );
}
