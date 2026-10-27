"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export const INTRO_DURATION_MS = 3200;
const SEEN_KEY = "swc:intro-seen";

function shouldPlay() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false;
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage blocked: play anyway, it only costs one extra intro.
  }
  return true;
}

// Animated logo splash, shown once per browser session. Decided after mount so
// server and client render the same markup.
export function BrandIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldPlay()) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Saltar intro"
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-[#1A1F24] animate-out fade-out fill-mode-forwards delay-[2700ms] duration-500"
    >
      <Image src="/brand/swc-intro.svg" alt="Smart Work Core" width={420} height={160} unoptimized priority className="h-auto w-[min(70vw,420px)]" />
    </button>
  );
}
