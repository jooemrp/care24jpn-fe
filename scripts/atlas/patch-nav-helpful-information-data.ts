/** Pure transformation for the site navigation patch. */
type Data = string | Record<string, unknown>;
type Block = { id: string; type: string; block_type_id: string; position: number; data: Data };
type Translation = { block_id: string; locale: string; data: Data };
type Page = { blocks: Block[]; block_translations?: Translation[] };

function object(value: Data): Record<string, unknown> {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Atlas returned a non-object block payload.");
  return { ...parsed as Record<string, unknown> };
}

export function addHelpfulInformation(page: Page) {
  const nav = page.blocks.filter((block) => block.type === "nav-item");
  if (nav.some((block) => object(block.data).href === "/helpful-information")) return null;
  const faq = nav.find((block) => object(block.data).href === "/faq");
  if (!faq) throw new Error("Expected a /faq nav-item block on site.");
  const position = faq.position;
  const blocks = page.blocks.map((block) => {
    const translations = Object.fromEntries((page.block_translations ?? [])
      .filter((row) => row.block_id === block.id)
      .map((row) => [row.locale, { data: object(row.data) }]));
    return {
      block_type_id: block.block_type_id,
      parent_id: null,
      position: block.position >= position ? block.position + 1 : block.position,
      data: object(block.data),
      ...(Object.keys(translations).length ? { translations } : {}),
    };
  });
  blocks.push({ block_type_id: nav[0].block_type_id, parent_id: null, position,
    data: { href: "/helpful-information", label: "お役立ち情報" },
    translations: { en: { data: { label: "Helpful Information" } } },
  });
  return blocks.sort((a, b) => a.position - b.position);
}
