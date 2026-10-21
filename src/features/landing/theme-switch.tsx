"use client";

import { ThemeTogglerButton } from "@/components/animate-ui/components/buttons/theme-toggler";

/** Same theme switch the app shell uses, as a small client island. The toggler keeps its own mount gate. */
export function ThemeSwitch() {
  return <ThemeTogglerButton variant="ghost" size="icon-sm" direction="ltr" modes={["light", "dark"]} aria-label="Cambiar tema" />;
}
