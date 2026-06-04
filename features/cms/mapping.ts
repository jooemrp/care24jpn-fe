import type { Lang } from "@/features/lang/store";

export function findSection<T extends { section_key: string }>(
  sections: T[],
  sectionKey: string
): T | undefined {
  return sections.find((s) => s.section_key === sectionKey);
}

export function getField(
  section:
    | { fields?: Record<string, { ja: string; en: string }> }
    | undefined,
  key: string,
  lang: Lang
): string {
  return section?.fields?.[key]?.[lang] ?? "";
}
