/**
 * Removes `<PhraseText>` markup (`<wbr/>` break points and the per-phrase
 * `<span>` units) from rendered HTML, so tests can assert on the copy
 * itself. Phrase placement is covered by lib/phrase.test.ts.
 */
export function stripPhraseMarkup(html: string): string {
  return html
    .replaceAll("<wbr/>", "")
    .replace(/<span>([^<]*)<\/span>/g, "$1");
}
