import type { Bilingual } from "@/constants/copy";

/**
 * Renders JP primary + EN secondary label — the site-wide bilingual pattern.
 * Used when both languages should always show (headings, card labels, etc.)
 * For single-language switching, use `t()` from `@/features/lang/store`.
 */
type BilingualTextProps = {
  text: Bilingual;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  className?: string;
  jpClassName?: string;
  enClassName?: string;
  multiline?: boolean;
};

export default function BilingualText({
  text,
  as: Wrapper = "div",
  className = "",
  jpClassName = "",
  enClassName = "",
  multiline = false,
}: BilingualTextProps) {
  return (
    <Wrapper className={className}>
      <span
        className={`block ${multiline ? "whitespace-pre-line" : ""} ${jpClassName}`}
        lang="ja"
      >
        {text.ja}
      </span>
      <span
        className={`mt-1 block text-xs uppercase tracking-widest text-muted ${enClassName}`}
        lang="en"
      >
        {text.en}
      </span>
    </Wrapper>
  );
}
