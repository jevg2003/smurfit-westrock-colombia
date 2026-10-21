"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const BorderBeam = dynamic(() => import("@/components/magicui/border-beam").then((m) => m.BorderBeam), { ssr: false });

const QUERY = "(prefers-reduced-motion: reduce)";

const hasMedia = () => typeof window.matchMedia === "function";

function subscribe(callback: () => void) {
  if (!hasMedia()) return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

/** Decorative moving light along the border of the parent. Off under reduced motion and while offscreen. */
export function LazyBeam() {
  const reduced = useSyncExternalStore(
    subscribe,
    () => !hasMedia() || window.matchMedia(QUERY).matches,
    () => true,
  );
  const holder = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = holder.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    observer.observe(node.parentElement ?? node);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={holder} aria-hidden="true" className="contents">
      {!reduced && visible && <BorderBeam size={220} duration={9} colorFrom="var(--primary)" colorTo="var(--info-foreground)" />}
    </span>
  );
}
