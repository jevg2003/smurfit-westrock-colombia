"use client";

import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CompanyAvatar } from "./company-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useActiveCompany, useCompaniesStore } from "@/stores/companies.store";

/**
 * Sidebar footer: the active company with a menu to switch to another one, create one or see all of them,
 * and "Cerrar sesión", which only leaves the company (it does not touch Cloudflare Access).
 */
export function CompanySwitcher() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const active = useActiveCompany();
  const companies = useCompaniesStore((state) => state.companies);
  const setActive = useCompaniesStore((state) => state.setActive);
  const clearActive = useCompaniesStore((state) => state.clearActive);
  const others = companies.filter((company) => company.id !== active?.id);

  const signOut = () => {
    clearActive();
    router.push("/empresas");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton tooltip={active?.name ?? "Empresa"} size="lg" className="data-popup-open:bg-sidebar-accent" />}>
            <CompanyAvatar name={active?.name ?? ""} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{active?.name ?? "Sin empresa"}</span>
            <ChevronsUpDownIcon aria-hidden="true" className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="end" className="min-w-56">
            {others.length > 0 && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Cambiar de empresa</DropdownMenuLabel>
                  {others.map((company) => (
                    <DropdownMenuItem key={company.id} onClick={() => setActive(company.id)}>
                      <CompanyAvatar name={company.name} size="sm" />
                      <span className="truncate">{company.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem render={<Link href="/onboarding?nueva=1" />}>Nueva empresa</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/empresas" />}>Ver todas las empresas</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Cerrar sesión" aria-label="Cerrar sesión" onClick={signOut}>
          <LogOutIcon aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:sr-only">Cerrar sesión</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
