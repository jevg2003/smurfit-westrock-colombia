"use client";

import { LayoutDashboardIcon, LineChartIcon, ListOrderedIcon, PanelLeftIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { ThemeTogglerButton } from "@/components/animate-ui/components/buttons/theme-toggler";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV = [
  { href: "/", label: "Resumen", icon: LayoutDashboardIcon },
  { href: "/dias", label: "Días y variaciones", icon: ListOrderedIcon },
  { href: "/alertas", label: "Alertas guardadas", icon: StarIcon },
];

function Logo() {
  return (
    <Button
      size="icon"
      nativeButton={false}
      render={<Link href="/" aria-label="Smurfit Westrock Colombia, inicio" />}
      className="size-7"
    >
      <LineChartIcon aria-hidden="true" className="size-3.5" />
    </Button>
  );
}

function MobileTrigger() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
      <PanelLeftIcon aria-hidden="true" />
      <span className="sr-only">Abrir navegación</span>
    </Button>
  );
}

interface Props {
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ actions, children }: Props) {
  const pathname = usePathname();
  const title = NAV.find((item) => item.href === pathname)?.label ?? "Monitor de entorno";

  return (
    <SidebarProvider
      defaultOpen={false}
      className="h-dvh [--header-height:50px]"
      style={{ "--sidebar-width-icon": "3rem" } as CSSProperties}
    >
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="items-center justify-center py-3 in-data-[mobile=true]:items-start in-data-[mobile=true]:px-4">
          <Logo />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={pathname === href}
                      tooltip={label}
                      aria-label={label}
                      render={<Link href={href} />}
                    >
                      <Icon aria-hidden="true" />
                      <span className="group-data-[collapsible=icon]:sr-only">{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="items-center justify-center py-3 in-data-[mobile=true]:items-start in-data-[mobile=true]:px-4">
          <ThemeTogglerButton variant="ghost" size="icon-sm" direction="ltr" modes={["light", "dark"]} aria-label="Cambiar tema" />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="overflow-hidden border border-border shadow-none md:peer-data-[variant=inset]:shadow-none">
        <header className="sticky top-0 z-10 flex h-(--header-height) w-full shrink-0 items-center gap-2 border-b border-border bg-background ps-3 pe-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <MobileTrigger />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <BreadcrumbLink render={<Link href="/" />}>Smurfit Westrock Colombia</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-1 flex-col gap-4">{children}</div>
          <p className="max-w-prose text-xs text-muted-foreground">
            Prototipo no oficial construido sobre el perfil público de Smurfit Westrock Colombia. Sin relación ni aval
            de la empresa. Fuente de datos: datos.gov.co, serie histórica de la TRM.
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
