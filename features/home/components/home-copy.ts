import type { Bilingual } from "@/constants/copy";

type HeadingLineCount = number | { ja?: number; en?: number };

export function splitBilingual(value: Bilingual, headingLines: HeadingLineCount = 1): {
  heading: Bilingual;
  body: Bilingual;
} {
  const split = (text: string, lineCount: number) => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return {
      heading: lines.slice(0, lineCount).join("\n"),
      body: lines.slice(lineCount).join("\n"),
    };
  };

  const ja = split(value.ja, typeof headingLines === "number" ? headingLines : (headingLines.ja ?? 1));
  const en = split(value.en, typeof headingLines === "number" ? headingLines : (headingLines.en ?? 1));
  return {
    heading: { ja: ja.heading, en: en.heading },
    body: { ja: ja.body, en: en.body },
  };
}
