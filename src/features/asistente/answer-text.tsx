import type { ReactNode } from "react";
import { safeHttpUrl } from "@/lib/safe-url";

const INLINE = /\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)|\*\*([^*\n]{1,200})\*\*|(https?:\/\/[^\s<>()]{1,500})/g;
const LIST_ITEM = /^\s*[-*]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="underline underline-offset-3 hover:text-foreground"
    >
      {children}
    </a>
  );
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const [whole, label, target, bold, bare] = match;
    if (label !== undefined) {
      const href = safeHttpUrl(target);
      nodes.push(href ? <ExternalLink key={index} href={href}>{label}</ExternalLink> : whole);
    } else if (bold !== undefined) {
      nodes.push(<strong key={index}>{bold}</strong>);
    } else if (bare !== undefined) {
      const trimmed = bare.replace(/[.,;:!?]+$/, "");
      const href = safeHttpUrl(trimmed);
      nodes.push(href ? <ExternalLink key={index} href={href}>{trimmed}</ExternalLink> : bare);
      if (trimmed.length < bare.length) nodes.push(bare.slice(trimmed.length));
    }
    last = index + whole.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Renders the assistant answer: paragraphs, bullet lists, bold and links. Everything is built as
 * React nodes (never HTML), and only http(s) links are clickable.
 */
export function AnswerText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim().length > 0);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const heading = lines.length === 1 ? HEADING.exec(lines[0]) : null;
        if (heading) return <p key={blockIndex}><strong>{inline(heading[1])}</strong></p>;

        const parts: ReactNode[] = [];
        let items: string[] = [];
        const flush = () => {
          if (items.length === 0) return;
          parts.push(
            <ul key={`ul-${parts.length}`} className="ml-5 list-disc space-y-1">
              {items.map((item, i) => <li key={i}>{inline(item)}</li>)}
            </ul>,
          );
          items = [];
        };
        for (const line of lines) {
          const item = LIST_ITEM.exec(line);
          if (item) {
            items.push(item[1]);
          } else {
            flush();
            if (line.trim()) parts.push(<p key={`p-${parts.length}`}>{inline(line)}</p>);
          }
        }
        flush();
        return <div key={blockIndex} className="flex flex-col gap-1.5">{parts}</div>;
      })}
    </div>
  );
}
