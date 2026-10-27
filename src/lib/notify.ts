import { toast } from "sonner";

/** The only place that talks to the toast library, so forms stay free of it. */
export const notifySaved = () => toast.success("Cambios guardados", { classNames: { icon: "text-success" } });

export const notifySaveFailed = () =>
  toast.error("No se pudieron guardar los cambios", { description: "Inténtelo de nuevo.", classNames: { icon: "text-destructive" } });

/** Runs a save and tells the user how it went. Returns false when it threw, so the form keeps its pending changes. */
export function saveWithFeedback(save: () => void): boolean {
  try {
    save();
  } catch {
    notifySaveFailed();
    return false;
  }
  notifySaved();
  return true;
}
