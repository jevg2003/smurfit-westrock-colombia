import { LineChartIcon, LogOutIcon, LayoutDashboardIcon, ListOrderedIcon, StarIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Separator } from "@/components/ui/separator";

export type Vista = "resumen" | "dias" | "alertas";

interface Props {
  vista: Vista;
  onCambiarVista: (vista: Vista) => void;
  onCerrarSesion: () => void;
  tituloVista: string;
  acciones?: ReactNode;
  children: ReactNode;
}

const NAV: { id: Vista; label: string; icon: ReactNode }[] = [
  { id: "resumen", label: "Resumen", icon: <LayoutDashboardIcon aria-hidden="true" /> },
  { id: "dias", label: "Días y variaciones", icon: <ListOrderedIcon aria-hidden="true" /> },
  { id: "alertas", label: "Alertas guardadas", icon: <StarIcon aria-hidden="true" /> },
];

export function AppShell({ vista, onCambiarVista, onCerrarSesion, tituloVista, acciones, children }: Props) {
  return (
    <SidebarProvider className="relative h-dvh min-h-0 w-full overflow-hidden">
      <Sidebar collapsible="icon" className="absolute h-full">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="Smurfit Westrock Colombia">
                <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <LineChartIcon className="size-4" aria-hidden="true" />
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:sr-only">
                  <span className="truncate text-sm font-medium">Smurfit Westrock</span>
                  <span className="text-sidebar-foreground/70 truncate text-xs">Monitor de entorno</span>
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
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={vista === item.id}
                      tooltip={item.label}
                      onClick={() => onCambiarVista(item.id)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
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
              <SidebarMenuButton size="lg" tooltip="analista" onClick={onCerrarSesion}>
                <Avatar className="size-8">
                  <AvatarFallback>AN</AvatarFallback>
                </Avatar>
                <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:sr-only">
                  <span className="truncate text-sm font-medium">analista</span>
                  <span className="text-sidebar-foreground/70 truncate text-xs">Cerrar sesión</span>
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
          <h1 className="truncate text-sm font-semibold">{tituloVista}</h1>
          <div className="ml-auto flex items-center gap-2">{acciones}</div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
