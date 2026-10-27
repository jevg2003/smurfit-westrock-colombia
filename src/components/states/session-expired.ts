export const SESSION_EXPIRED_TITLE = "Sesión vencida";
export const SESSION_EXPIRED_MESSAGE = "Su sesión de acceso venció. Vuelva a entrar para seguir.";
export const SESSION_EXPIRED_ACTION = "Volver a entrar";

/** Reloads the page; Cloudflare Access then shows its login. */
export function reenterSession() {
  window.location.reload();
}
