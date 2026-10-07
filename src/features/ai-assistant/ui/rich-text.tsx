import { parseRichText, type Inline } from "@/entities/assistant";

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((part, i) =>
        part.kind === "bold" ? (
          <strong key={i} className="font-semibold text-zinc-950">
            {part.text}
          </strong>
        ) : part.kind === "code" ? (
          <code key={i} className="rounded-md bg-zinc-100 px-1 py-0.5 font-mono text-[12.5px] text-zinc-800">
            {part.text}
          </code>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** Renders an assistant reply as text nodes only; formatting comes from `parseRichText`. */
export function RichText({ text, caret = false }: { text: string; caret?: boolean }) {
  const blocks = parseRichText(text);
  return (
    <div className="space-y-2.5 text-[14.5px] leading-relaxed text-zinc-800">
      {blocks.map((block, i) => {
        const last = i === blocks.length - 1;
        const tail = caret && last ? <Caret /> : null;
        if (block.kind === "heading") {
          return (
            <p key={i} className="text-[15px] font-semibold tracking-tight text-zinc-950">
              <Inlines items={block.inlines} />
              {tail}
            </p>
          );
        }
        if (block.kind === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={i} className={block.ordered ? "list-decimal space-y-1 ps-5" : "list-disc space-y-1 ps-5 marker:text-zinc-400"}>
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inlines items={item} />
                  {caret && last && j === block.items.length - 1 ? <Caret /> : null}
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={i}>
            <Inlines items={block.inlines} />
            {tail}
          </p>
        );
      })}
      {blocks.length === 0 && caret ? <Caret /> : null}
    </div>
  );
}

function Caret() {
  return <span aria-hidden className="animate-assistant-caret ms-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] rounded-full bg-indigo-500" />;
}
