import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

interface Props {
  title: string;
  description?: string;
  /** One action: a button or a link. */
  action?: { label: string; onClick: () => void } | { label: string; href: string };
}

/** Empty state of a region: one sentence and, when it helps, one action. */
export function RegionEmpty({ title, description, action }: Props) {
  return (
    <Empty className="border-0 p-6">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action &&
        ("href" in action ? (
          <Button variant="outline" size="sm" render={<Link href={action.href} />}>
            {action.label}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </Empty>
  );
}
