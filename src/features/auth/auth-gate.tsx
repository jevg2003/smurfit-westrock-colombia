"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./use-auth";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { listo, autenticado } = useAuth();

  useEffect(() => {
    if (listo && !autenticado) router.replace("/login");
  }, [listo, autenticado, router]);

  if (!listo || !autenticado) return null;
  return children;
}
