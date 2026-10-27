import type { ReactNode } from "react";
import { AppProviders } from "../(app)/app-providers";

/** Private pages outside the sidebar (company picker, onboarding): same stores; each page lays itself out. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
