"use client";

import { useEffect } from "react";
import { INTRO_ATTR, INTRO_DURATION_MS } from "./intro-policy";
import { SWC_INTRO_MARKUP, SWC_INTRO_VIEWBOX } from "./swc-intro-art";
import "./swc-intro.css";
import "./brand-intro.css";

function end() {
  document.documentElement.removeAttribute(INTRO_ATTR);
}

/**
 * The intro overlay. It always renders the same markup (server and client), and CSS shows it
 * only while <html> carries the intro attribute, so there is nothing to hydrate differently.
 * This component only ends the intro: after its duration, on click, or on any key.
 */
export function IntroCloser() {
  useEffect(() => {
    if (!document.documentElement.hasAttribute(INTRO_ATTR)) return;
    const timer = setTimeout(end, INTRO_DURATION_MS);
    window.addEventListener("keydown", end, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", end);
    };
  }, []);

  return (
    <button type="button" aria-label="Saltar intro" onClick={end} className="swc-intro">
      <svg
        viewBox={SWC_INTRO_VIEWBOX}
        role="img"
        aria-label="Smart Work Core by mecateo.co"
        className="swc-intro-art"
        dangerouslySetInnerHTML={{ __html: SWC_INTRO_MARKUP }}
      />
    </button>
  );
}
