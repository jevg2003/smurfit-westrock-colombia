import { z } from "zod";

/**
 * Zod 4 probes `new Function("")` to decide whether to compile schemas just-in-time. Under a strict
 * CSP that probe is reported as an `unsafe-eval` violation even though Zod catches the error.
 * Turning the JIT off removes the violation at a negligible cost for the small schemas in this app.
 * Import this module before any schema is created.
 */
z.config({ jitless: true });
