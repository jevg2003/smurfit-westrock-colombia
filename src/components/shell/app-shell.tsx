"use client";

import { LayoutDashboardIcon, LineChartIcon, ListOrderedIcon, LogOutIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/use-auth";

const NAV = [
  { href: "/", label: "Resumen", icon: LayoutDashboardIcon },
  { href: "/dias", label: "Días y variaciones", icon: ListOrderedIcon },
  { href: "/alertas", label: "Alertas guardadas", icon: StarIcon },
];

interface Props {
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ actions, children }: Props) {
  const { cerrarSesion } = useAuth();
  const pathname = usePathname();
  const title = NAV.find((item) => item.href === pathname)?.label ?? "Monitor de entorno";

  return (
    <SidebarProvider className="relative h-dvh min-h-0 w-full overflow-hidden">
      <Sidebar collapsible="icon" className="absolute h-full">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="Smurfit Westrock Colombia">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LineChartIcon className="size-4" aria-hidden="true" />
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:sr-only">
                  <span className="truncate text-sm font-medium">Smurfit Westrock</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">Monitor de entorno</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent role="navigation" aria-label="Principal">
          <SidebarGroup>
            <SidebarGroupLabel>Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton isActive={pathname === href} tooltip={label} render={<Link href={href} />}>
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="Cerrar sesión" onClick={cerrarSesion}>
                <Avatar className="size-8">
                  <AvatarFallback>AN</AvatarFallback>
                </Avatar>
                <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:sr-only">
                  <span className="truncate text-sm font-medium">analista</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">Cerrar sesión</span>
                </span>
                <LogOutIcon className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" aria-hidden="true" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
