/**
 * Server-side feature flags: each external source can be switched off without a code change.
 * Read from `process.env` on the server only. Never prefix them with `NEXT_PUBLIC_`: the client
 * only ever sees the result (a "source switched off" state), not the variables.
 */
export interface SourceFlags {
  /** Colombian media RSS feeds. */
  newsRss: boolean;
  /** Google News RSS search (terms of use: personal, non-commercial; risk accepted, see the feature doc). */
  googleNews: boolean;
  /** Minambiente press feed. */
  minambiente: boolean;
  /** Presidencia decrees dataset. */
  presidencia: boolean;
  /** XM national spot electricity price (public API, no CORS: read on the server). */
  xm: boolean;
}

type Env = Record<string, string | undefined>;

const OFF_VALUES = new Set(["false", "0", "off", "no"]);

/** A flag is on unless its variable is explicitly `false`, `0`, `off` or `no`. */
function isOn(value: string | undefined): boolean {
  return value === undefined || !OFF_VALUES.has(value.trim().toLowerCase());
}

export function readFlags(env: Env = process.env): SourceFlags {
  return {
    newsRss: isOn(env.FEATURE_NEWS_RSS),
    googleNews: isOn(env.FEATURE_GOOGLE_NEWS),
    minambiente: isOn(env.FEATURE_MINAMBIENTE),
    presidencia: isOn(env.FEATURE_PRESIDENCIA),
    xm: isOn(env.FEATURE_XM),
  };
}
