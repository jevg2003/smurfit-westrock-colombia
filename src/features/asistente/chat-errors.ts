import { SESSION_EXPIRED_MESSAGE, SESSION_EXPIRED_TITLE } from "@/components/states/session-expired";
import { SessionExpiredError } from "./chat-fetch";

export interface ChatFailure {
  title: string;
  message: string;
  /** True when the fix is to log in again (reload), not to retry the message. */
  reenter?: boolean;
}

const GENERIC = "No pude responder en este momento. Vuelva a intentarlo.";

function serverMessage(error: Error): string | undefined {
  try {
    const parsed: unknown = JSON.parse(error.message);
    if (typeof parsed === "object" && parsed !== null && "error" in parsed && typeof parsed.error === "string") return parsed.error;
  } catch {
    // Not JSON: it is a stream error message or a client error.
  }
  return undefined;
}

/** Turns a `useChat` error into Spanish copy for the error state. 503, 429 and network are told apart. */
export function describeChatFailure(error: Error): ChatFailure {
  if (error instanceof SessionExpiredError || serverMessage(error) === "unauthorized") {
    return { title: SESSION_EXPIRED_TITLE, message: SESSION_EXPIRED_MESSAGE, reenter: true };
  }
  if (error instanceof TypeError || /failed to fetch|network/i.test(error.message)) {
    return { title: "Sin conexión", message: "No hay conexión con el servidor. Revise su conexión y vuelva a intentarlo." };
  }
  const fromServer = serverMessage(error);
  if (fromServer) {
    const unavailable = /no está configurado/i.test(fromServer);
    return { title: unavailable ? "Asistente no disponible" : "No se pudo responder", message: fromServer };
  }
  if (/demasiadas consultas/i.test(error.message)) return { title: "Demasiadas consultas", message: error.message };
  if (/rechaz[oó] la clave/i.test(error.message)) return { title: "Asistente no disponible", message: error.message };
  return { title: "No se pudo responder", message: GENERIC };
}
