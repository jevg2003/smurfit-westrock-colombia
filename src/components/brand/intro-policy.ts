// When the logo intro plays. The decision runs as an inline script before first paint
// (see BrandIntro), so the panel never flashes before the intro covers it.

/** Attribute set on <html> while the intro is on screen. */
export const INTRO_ATTR = "data-swc-intro";
/** Set by the landing call to action: the next app load always plays the intro. */
export const INTRO_ENTER_KEY = "swc:intro-enter";
/** Last time the intro played (ms epoch), shared across tabs. */
export const INTRO_LAST_KEY = "swc:intro-last";
/** Outside a landing click, the intro plays at most once in this window. */
export const INTRO_TTL_MS = 12 * 60 * 60 * 1000;
/** Draw-on (~2.7s) + hold + fade (see brand-intro.css). */
export const INTRO_DURATION_MS = 3800;

/** Call from a landing link right before it navigates to the app. */
export function markIntroFromLanding() {
  try {
    sessionStorage.setItem(INTRO_ENTER_KEY, "1");
  } catch {
    // Storage blocked: the time window still applies.
  }
}

// Mounted in the root layout so the intro survives the client redirects that pick the
// destination (panel, company list or onboarding) underneath it. The landing never plays it.
export const INTRO_SCRIPT = `try{if(location.pathname!=="/"){var s=sessionStorage,l=localStorage,n=Date.now(),f=s.getItem(${JSON.stringify(INTRO_ENTER_KEY)});s.removeItem(${JSON.stringify(INTRO_ENTER_KEY)});if(f||n-(Number(l.getItem(${JSON.stringify(INTRO_LAST_KEY)}))||0)>${INTRO_TTL_MS}){l.setItem(${JSON.stringify(INTRO_LAST_KEY)},String(n));document.documentElement.setAttribute(${JSON.stringify(INTRO_ATTR)},"play")}}}catch(e){}`;
