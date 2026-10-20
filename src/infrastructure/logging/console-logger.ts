import type { Logger } from "@/core/ports/logger";

/** Logger port backed by the console, as one JSON line per event. */
export const consoleLogger: Logger = {
  debug: (message, context) => console.debug(JSON.stringify({ level: "debug", message, ...context })),
  info: (message, context) => console.info(JSON.stringify({ level: "info", message, ...context })),
  warn: (message, context) => console.warn(JSON.stringify({ level: "warn", message, ...context })),
  error: (message, context) => console.error(JSON.stringify({ level: "error", message, ...context })),
};
