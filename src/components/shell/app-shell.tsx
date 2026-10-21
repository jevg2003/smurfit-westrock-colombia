"use client";

import {
  BellRingIcon,
  FileTextIcon,
  GlobeIcon,
  HistoryIcon,
  LandmarkIcon,
  LineChartIcon,
  NewspaperIcon,
  LayoutGridIcon,
  ListOrderedIcon,
  PanelLeftIcon,
  RadarIcon,
  ScaleIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  StarIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { ThemeTogglerButton } from "@/components/animate-ui/components/buttons/theme-toggler";
import { Button } from "@/components/ui/button";
import { AssistantSheet } from "@/features/asistente/assistant-sheet";
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

const NAV_GROUPS = [
  {
    label: "Operación",
    items: [
      { href: "/", label: "Radar", icon: RadarIcon },
      { href: "/senales", label: "Señales", icon: ZapIcon },
      { href: "/pestel", label: "PESTEL", icon: LayoutGridIcon },
      { href: "/alertas", label: "Alertas", icon: BellRingIcon },
      { href: "/linea-de-tiempo", label: "Línea de tiempo", icon: HistoryIcon },
      { href: "/briefing", label: "Briefing", icon: FileTextIcon },
      { href: "/seguimiento", label: "Seguimiento", icon: StarIcon },
      { href: "/asistente", label: "Asistente", icon: SparklesIcon },
    ],
  },
  {
    label: "Dimensiones",
    items: [
      { href: "/macro", label: "Macro", icon: GlobeIcon },
      { href: "/dias", label: "TRM: días y variaciones", icon: ListOrderedIcon },
      { href: "/contratacion", label: "Contratación", icon: LandmarkIcon },
      { href: "/competidores", label: "Competidores", icon: UsersIcon },
      { href: "/noticias", label: "Noticias", icon: NewspaperIcon },
      { href: "/regulacion", label: "Regulación", icon: ScaleIcon },
    ],
  },
  {
    label: "Confianza",
    items: [{ href: "/preferencias", label: "Preferencias", icon: SlidersHorizontalIcon }],
  },
];

const NAV = NAV_GROUPS.flatMap((group) => group.items);

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
    <PageContextProvider>
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
          ))}
        </SidebarContent>

        <SidebarFooter className="items-center justify-center py-3 in-data-[mobile=true]:items-start in-data-[mobile=true]:px-4">
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
                  <BreadcrumbLink render={<Link href="/" />}>Smurfit Westrock Colombia</BreadcrumbLink>
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
            {pathname !== "/asistente" && <AssistantSheet />}
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4 print:overflow-visible">
          <div className="flex flex-1 flex-col gap-4">{children}</div>
          <footer className="max-w-prose text-xs text-muted-foreground print:hidden">
            <p className="font-medium">Prototipo no oficial, sin relación ni aval de Smurfit Westrock.</p>
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
