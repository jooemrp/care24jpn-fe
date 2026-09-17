import type { Bilingual } from "@/constants/copy";

/** Apply one requested Japanese editorial break while preserving other copy. */
export function japaneseBreakAfter(value: Bilingual, marker: string): Bilingual {
  const normalized = value.ja.replace(/\s*\n\s*/g, "").trim();
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex < 0) return value;

  const splitAt = markerIndex + marker.length;
  return {
    ...value,
    ja: `${normalized.slice(0, splitAt)}\n${normalized.slice(splitAt).trimStart()}`,
    en: value.en.replace(/\s*\n\s*/g, " "),
  };
}

export function mobileMedicalNote(value: Bilingual): Bilingual {
  const normalizedJa = value.ja.replace(/\s*\n\s*/g, "").trim();
  const markers = [
    "ご利用には主治医からの",
    "指示書が必要です。",
    "必要に応じて、ケアマネージャーや",
    "ソーシャルワーカー、介護保険",
    "サービス事業所と連携し、",
  ];

  // Only apply the editorial layout to the known published copy. If the CMS
  // changes the wording, preserve that content rather than showing stale text.
  if (markers.some((marker) => !normalizedJa.includes(marker))) return value;

  const ja = markers.reduce(
    (text, marker) => text.replace(marker, `${marker}\n`),
    normalizedJa,
  );

  return {
    ...value,
    ja: ja.replace(/\n+$/, ""),
  };
}

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
