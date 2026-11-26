import type { ReactNode } from "react";

/*
 * Minimal, safe Markdown for assistant answers: headings (#–###), bullet and
 * numbered lists, paragraphs, **bold**, *italic* and `code`. Builds React
 * elements — never injects HTML.
 */

type Block =
  | { kind: "heading"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "p"; text: string };

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();
    const heading = /^#{1,3}\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];

    if (!line.trim()) flush();
    else if (heading) {
      flush();
      blocks.push({ kind: "heading", text: heading[1] ?? "" });
    } else if (bullet) {
      flush();
      if (last?.kind === "ul") last.items.push(bullet[1] ?? "");
      else blocks.push({ kind: "ul", items: [bullet[1] ?? ""] });
    } else if (numbered) {
      flush();
      if (last?.kind === "ol") last.items.push(numbered[1] ?? "");
      else blocks.push({ kind: "ol", items: [numbered[1] ?? ""] });
    } else paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[12px] text-fg">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function Markdown({ source }: { source: string }) {
  return (
    <div className="space-y-2.5 text-[13.5px] leading-relaxed text-fg-2">
      {parseBlocks(source).map((block, i) => {
        if (block.kind === "heading") {
          return (
            <h4 key={i} className="pt-1 text-[13.5px] font-semibold text-fg">
              {inline(block.text)}
            </h4>
          );
        }
        if (block.kind === "ul" || block.kind === "ol") {
          const List = block.kind;
          return (
            <List key={i} className={List === "ul" ? "list-disc space-y-1 pl-5 marker:text-fg-4" : "list-decimal space-y-1 pl-5 marker:text-fg-3"}>
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </List>
          );
        }
        return <p key={i}>{inline(block.text)}</p>;
      })}
    </div>
  );
}
