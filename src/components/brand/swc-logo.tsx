import { useId, type SVGProps } from "react";

// Geometry mirrors the brand kit generator (mark-only kit in mecate-co/branding/swc).
// Letters use currentColor so they follow the app theme; the core dot stays lime.
const STROKE = 24;
const LIME = "#A3E40A";
const C_PATH = "M79.11 25.57 A38 38 0 1 0 79.11 74.43";

type Props = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children"> & { title?: string };

function labelProps(title: string | undefined) {
  return title ? { role: "img", "aria-label": title } : { "aria-hidden": true };
}

/** The C with its core dot: favicon, sidebar and other square slots. */
export function SwcSymbol({ title, ...props }: Props) {
  return (
    <svg viewBox="0 0 100 100" fill="none" {...labelProps(title)} {...props}>
      <path d={C_PATH} stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <circle cx="50" cy="50" r="14" fill={LIME} />
    </svg>
  );
}

/** The full SWC wordmark. */
export function SwcWordmark({ title, ...props }: Props) {
  const clip = useId();
  return (
    <svg viewBox="0 0 296 100" fill="none" {...labelProps(title)} {...props}>
      <defs>
        <clipPath id={clip}>
          <rect x="-20" y="0" width="336" height="100" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`} stroke="currentColor" strokeWidth={STROKE} strokeLinejoin="round">
        <path d="M76 12 H31 A19 19 0 0 0 31 50 H45 A19 19 0 0 1 45 88 H0" />
        <path d="M97 -20 L111 88 L138 30 L165 88 L179 -20" />
        <path d="M275.11 25.57 A38 38 0 1 0 275.11 74.43" strokeLinecap="round" />
      </g>
      <circle cx="246" cy="50" r="14" fill={LIME} />
    </svg>
  );
}
