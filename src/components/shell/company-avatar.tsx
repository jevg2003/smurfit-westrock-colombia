import { companyInitials } from "@/core/company/initials";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/** Avatar with the initials of a company; shared by the company picker and the sidebar switcher. */
export function CompanyAvatar({ name, size }: { name: string; size?: "default" | "sm" | "lg" }) {
  return (
    <Avatar size={size}>
      <AvatarFallback aria-hidden="true">{companyInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
