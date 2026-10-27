import type { ReactNode } from "react";
import { AppProviders } from "../(app)/app-providers";

/** Private pages outside the sidebar (company picker, onboarding): same stores, centered column. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-4 py-10 sm:px-6">{children}</main>
    </AppProviders>
  );
}
