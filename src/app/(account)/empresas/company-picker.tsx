"use client";

import { MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { CompanyAvatar } from "@/components/shell/company-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import type { CompanyProfile } from "@/core/company/profile";
import { useCompaniesStore } from "@/stores/companies.store";
import { deleteCompany } from "@/stores/company-data";
import { useHydrationStore } from "@/stores/hydration.store";

/** Secondary line of a row: sector and city when known, otherwise the first line of the activity. */
const detailOf = (company: CompanyProfile) => [company.sector, company.city].map((part) => part?.trim()).filter(Boolean).join(", ") || company.activity;

export function CompanyPicker() {
  const router = useRouter();
  const hasHydrated = useHydrationStore((state) => state.hasHydrated);
  const companies = useCompaniesStore((state) => state.companies);
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId);
  const setActive = useCompaniesStore((state) => state.setActive);
  const [pendingDelete, setPendingDelete] = useState<CompanyProfile | null>(null);

  const empty = hasHydrated && companies.length === 0;
  useEffect(() => {
    if (empty) router.replace("/onboarding");
  }, [empty, router]);

  const open = (id: string) => {
    setActive(id);
    router.push("/home");
  };

  if (!hasHydrated || empty) return <Skeleton role="status" aria-label="Cargando tus empresas" className="h-72 rounded-xl" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Sus empresas</h1>
        <p className="text-sm text-muted-foreground">Elija una para ver su radar.</p>
      </div>

      <ItemGroup aria-label="Empresas" className="gap-2">
        {companies.map((company) => (
          <Item key={company.id} variant="outline" size="xs" role="listitem" className="relative transition-colors hover:bg-muted/50 has-focus-visible:ring-2 has-focus-visible:ring-ring/50">
            <ItemMedia>
              <CompanyAvatar name={company.name} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                <button
                  type="button"
                  aria-label={`Abrir ${company.name}`}
                  onClick={() => open(company.id)}
                  className="outline-none after:absolute after:inset-0 after:content-['']"
                >
                  {company.name}
                </button>
              </ItemTitle>
              <ItemDescription className="line-clamp-1">{detailOf(company)}</ItemDescription>
            </ItemContent>
            <ItemActions className="relative z-10">
              {company.id === activeCompanyId && <Badge variant="info-light">Activa</Badge>}
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
                  <MoreHorizontalIcon aria-hidden="true" />
                  <span className="sr-only">Acciones de {company.name}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => open(company.id)}>Abrir</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setPendingDelete(company)}>
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>

      <Button variant="outline" className="w-fit" onClick={() => router.push("/onboarding?nueva=1")}>
        <PlusIcon aria-hidden="true" />
        Crear nueva empresa
      </Button>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(next) => !next && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {pendingDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Su perfil, avisos, decisiones y conversaciones se borran de este navegador. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) deleteCompany(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
