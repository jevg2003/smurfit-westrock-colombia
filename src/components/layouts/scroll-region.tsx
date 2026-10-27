import type { ComponentProps } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Props extends ComponentProps<"section"> {
  /** `aside` keeps the complementary landmark of a side column. */
  as?: "section" | "aside";
  /** Classes of the element that holds the content inside the scrolling viewport. */
  contentClassName?: string;
}

/**
 * A column of a layout that scrolls by itself on a desktop (lg) and flows with the page below it.
 *
 * Base UI's viewport takes its height from the ScrollArea root, so the root is a flex item (`flex-1 min-h-0`) of a
 * flex column that sits in a track with a definite height. Below lg the section is a plain block: the root has no
 * height to fill, the viewport grows with the content and the page scrolls, with no nested scroll on a phone.
 */
export function ScrollRegion({ as: Tag = "section", className, contentClassName, children, ...props }: Props) {
  return (
    <Tag className={cn("min-h-0 min-w-0 lg:flex lg:flex-col", className)} {...props}>
      <ScrollArea className="min-h-0 flex-1">
        <div className={cn("flex min-h-full flex-col", contentClassName)}>{children}</div>
      </ScrollArea>
    </Tag>
  );
}
