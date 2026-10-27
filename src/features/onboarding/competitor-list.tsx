"use client";

import { MoreHorizontalIcon, PencilIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { CompanyAvatar } from "@/components/shell/company-avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { formatNitWithDv } from "@/core/company/nit";
import type { Competitor } from "./competitor-dialog";

interface CompetitorListProps {
  competitors: readonly Competitor[];
  onEdit(competitor: Competitor): void;
  onRemove(competitor: Competitor): void;
}

/** The competitors of the company as compact rows: initials, name, NIT and a menu to edit or remove. */
export function CompetitorList({ competitors, onEdit, onRemove }: CompetitorListProps) {
  if (competitors.length === 0) {
    return (
      <Empty className="border border-dashed py-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Aún no hay competidores</EmptyTitle>
          <EmptyDescription>Agregue los que vigila para seguir sus noticias y contratos.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ItemGroup aria-label="Competidores">
      {competitors.map((competitor) => (
        <Item key={competitor.name} variant="outline" size="xs" role="listitem">
          <ItemMedia>
            <CompanyAvatar name={competitor.name} />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{competitor.name}</ItemTitle>
            <ItemDescription className="tabular-nums">{competitor.nit ? formatNitWithDv(competitor.nit) : "Sin NIT"}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Acciones de ${competitor.name}`} />}>
                <MoreHorizontalIcon aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(competitor)}>
                  <PencilIcon aria-hidden="true" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onRemove(competitor)}>
                  <Trash2Icon aria-hidden="true" />
                  Quitar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
