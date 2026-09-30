import { Fragment } from "react";
import { isJapanese, phraseUnits } from "@/lib/phrase";

type PhraseTextProps = {
  text: string;
  className?: string;
};

/**
 * Renders copy so Japanese wraps only between phrases (BudouX boundaries
 * marked with `<wbr>`, everything else locked by `.jp-phrase`). Non-Japanese
 * text renders unchanged. CMS `\n` still needs `whitespace-pre-line` on the
 * caller when it should be honoured.
 */
export function PhraseText({ text, className = "" }: PhraseTextProps) {
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
                  {phrase}
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
