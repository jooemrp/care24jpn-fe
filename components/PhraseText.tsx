import { Fragment } from "react";
import { isJapanese, phraseUnits } from "@/lib/phrase";

type PhraseTextProps = {
  text: string;
  className?: string;
  /**
   * Wraps the last N characters in `.jp-tail` (nowrap inside `.article-prose`)
   * so a justified block can end on at least N characters without the whole
   * last phrase becoming one atomic block that stretches the line above it.
   */
  keepTail?: number;
};

/**
 * Renders copy so Japanese wraps only between phrases (BudouX boundaries
 * marked with `<wbr>`, everything else locked by `.jp-phrase`). Non-Japanese
 * text renders unchanged. CMS `\n` still needs `whitespace-pre-line` on the
 * caller when it should be honoured.
 */
export function PhraseText({ text, className = "", keepTail = 0 }: PhraseTextProps) {
  if (!isJapanese(text)) {
    return className ? <span className={className}>{text}</span> : <>{text}</>;
  }
  // A single phrase still needs `.jp-phrase` so it cannot break inside.
  const units = phraseUnits(text);
  return (
    <span className={`jp-phrase ${className}`.trim()}>
      {units.map((unit, index) => {
        // A CMS `\n` inside the inline-block would not break the parent
        // line, so it renders after the unit.
        const last = unit[unit.length - 1]!;
        const newlines = last.slice(last.replace(/\n+$/, "").length);
        const phrases = [...unit.slice(0, -1), last.slice(0, last.length - newlines.length)];
        return (
          <Fragment key={index}>
            {index > 0 && <wbr />}
            <span>
              {phrases.map((phrase, inner) => (
                <Fragment key={inner}>
                  {inner > 0 && <wbr />}
                  {keepTail > 0 && index === units.length - 1 && inner === phrases.length - 1
                    ? withTail(phrase, keepTail)
                    : phrase}
                </Fragment>
              ))}
            </span>
            {newlines}
          </Fragment>
        );
      })}
    </span>
  );
}

/** Splits off the last `count` characters into a `.jp-tail` span. */
function withTail(phrase: string, count: number) {
  const chars = Array.from(phrase);
  if (chars.length <= count) return <span className="jp-tail">{phrase}</span>;
  return (
    <>
      {chars.slice(0, -count).join("")}
      <span className="jp-tail">{chars.slice(-count).join("")}</span>
    </>
  );
}
