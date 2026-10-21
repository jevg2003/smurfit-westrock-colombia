/** Thrown when `/api/chat` answers 401/403: the Cloudflare Access session expired. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Access session expired");
    this.name = "SessionExpiredError";
  }
}

/**
 * Same-origin fetch for the chat transport. The `X-Requested-With` header makes Cloudflare Access
 * answer an expired session with a 401 instead of a login redirect the browser cannot follow.
 */
export function createChatFetch(base: typeof fetch = (...args) => fetch(...args)): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("X-Requested-With", "XMLHttpRequest");
    const response = await base(input, { ...init, headers });
    if (response.status === 401 || response.status === 403) throw new SessionExpiredError();
    return response;
  };
}
