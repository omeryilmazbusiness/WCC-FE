import { Fragment } from "react";

function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Marks every occurrence of the search terms (case-insensitive) inside `text`. */
export function Highlight({ text, terms }: { text: string; terms: readonly string[] }) {
  const usable = terms.filter((t) => t.length > 1);
  if (usable.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${usable.map(escape).join("|")})`, "giu");
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[4px] bg-amber-100 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
