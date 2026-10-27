"use client";

import { HomeIcon, PanelLeftIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { CompanySwitcher } from "./company-switcher";
import { BRAND_HREF, HOME_HREF, NAV_GROUPS, isNavActive, navTitle } from "./nav";
import { BrandIntro } from "@/components/brand/brand-intro";
import { ThemeTogglerButton } from "@/components/animate-ui/components/buttons/theme-toggler";
import { Button } from "@/components/ui/button";
import { AssistantSheet } from "@/features/asistente/assistant-sheet";
import { useActiveCompany } from "@/stores/companies.store";
import { PageContextProvider } from "@/features/asistente/page-context";
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";

function Logo() {
  return (
    <Link href={BRAND_HREF} aria-label="Smart Work Core, radar" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <Image src="/icon.svg" alt="" aria-hidden="true" width={28} height={28} unoptimized priority />
    </Link>
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
  const company = useActiveCompany();
  const title = navTitle(pathname);

  return (
    <PageContextProvider>
    <BrandIntro />
    <SidebarProvider
      defaultOpen={false}
      className="h-dvh [--header-height:50px]"
      style={{ "--sidebar-width-icon": "3rem" } as CSSProperties}
    >
      <Sidebar variant="inset" collapsible="icon" className="print:hidden">
        <SidebarHeader className="items-center justify-center py-3 in-data-[mobile=true]:items-start in-data-[mobile=true]:px-4">
          <Logo />
        </SidebarHeader>

        <SidebarContent>
          {NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(({ href, label, icon: Icon }) => (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        isActive={isNavActive(pathname, href)}
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
          ))}
        </SidebarContent>

        <SidebarFooter className="items-center justify-center py-3 in-data-[mobile=true]:items-start in-data-[mobile=true]:px-4">
          <CompanySwitcher />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Inicio" aria-label="Inicio" render={<Link href={HOME_HREF} />}>
                <HomeIcon aria-hidden="true" />
                <span className="group-data-[collapsible=icon]:sr-only">Inicio</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <ThemeTogglerButton variant="ghost" size="icon-sm" direction="ltr" modes={["light", "dark"]} aria-label="Cambiar tema" />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="overflow-hidden border border-border shadow-none md:peer-data-[variant=inset]:shadow-none">
        <header className="print:hidden sticky top-0 z-10 flex h-(--header-height) w-full shrink-0 items-center gap-2 border-b border-border bg-background ps-3 pe-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <MobileTrigger />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <BreadcrumbLink render={<Link href={BRAND_HREF} />}>Smart Work Core</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {pathname === "/dias" && actions}
            {pathname !== "/asistente" && company && <AssistantSheet />}
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4 print:overflow-visible">
          <div className="flex flex-1 flex-col gap-4">{children}</div>
          <footer className="max-w-prose text-xs text-muted-foreground print:hidden">
            <p className="font-medium">Smart Work Core: herramienta independiente, sin aval de las entidades que publican los datos.</p>
            <p>
              Construido con datos públicos (datos.gov.co: TRM, SECOP II, Supersociedades y exportaciones; Banco Mundial: PIB e inflación; titulares de medios y Google News; Minambiente y decretos de Presidencia). Las señales salen de reglas escritas y
              visibles. El asistente de IA solo lee estos datos y puede equivocarse.
            </p>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </PageContextProvider>
  );
}
