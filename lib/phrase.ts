import { Parser, jaModel } from "budoux";

/**
 * Japanese phrase segmentation for natural line wrapping (client sheet (7),
 * J16: wrap by phrase at every width, never mid-word, no hardcoded `<br>`).
 *
 * BudouX finds the phrase boundaries and the rules below group them into
 * units. `<PhraseText>` renders each unit as an inline-block with `<wbr>`
 * between units, and `word-break: keep-all` (see `.jp-phrase` in
 * globals.css) forbids every other break. This works on iOS Safari, where
 * `word-break: auto-phrase` is unsupported.
 */

const parser = new Parser(jaModel);

/** Hiragana, katakana, and CJK ideographs. */
const JAPANESE = /[぀-ヿ㐀-鿿]/;

export function isJapanese(text: string): boolean {
  return JAPANESE.test(text);
}

/**
 * Auxiliary endings that must never open a line — BudouX occasionally
 * splits them off (`午後6時と|なります`, `お問い合わせ|ください`), which the
 * client flagged as unbalanced (sheet row 29).
 */
const GLUE_TO_PREVIOUS = /^(?:なります|ください|いたします|です|ます)/;

/** A closing phrase this short would read as an orphan (`1日の|流れ`). */
const MAX_ORPHAN_LENGTH = 2;

/**
 * Case particle BudouX sometimes fuses with the next phrase
 * (`お電話にてお気軽に`); the client wants the break after it (sheet row 33).
 */
const SPLIT_AFTER = /(にて)(?=.)/;

function splitAfterParticle(phrase: string): string[] {
  const match = SPLIT_AFTER.exec(phrase);
  if (!match) return [phrase];
  const cut = match.index + match[1]!.length;
  return [phrase.slice(0, cut), ...splitAfterParticle(phrase.slice(cut))];
}

/**
 * Short modifiers that read as one unit with the phrase after them: the
 * adverb お気軽に, and a noun+の of up to four characters (あなたの,
 * 近隣の, お急ぎの). Every client-approved break in sheet (7) keeps these
 * pairs together; longer の-phrases (サービス利用の) stand on their own.
 */
const MAX_GLUED_MODIFIER = 4;

function gluesToNext(phrase: string): boolean {
  if (phrase === "お気軽に") return true;
  const core = phrase.replace(/^[「『（]/, "");
  return core.endsWith("の") && core.length <= MAX_GLUED_MODIFIER;
}

type Unit = string[];

/**
 * Groups BudouX phrases into units that each move to the next line whole.
 * A unit keeps its glued phrases as separate entries: they are the fallback
 * break points when the whole unit cannot fit on one line of a narrow box
 * (`着替えの/お手伝い`), so a glue never forces a mid-word split.
 */
function segmentLine(line: string): Unit[] {
  const units: Unit[] = [];
  let pending: Unit | null = null;
  for (const phrase of parser.parse(line).flatMap(splitAfterParticle)) {
    const last = units[units.length - 1];
    if (!pending && last && GLUE_TO_PREVIOUS.test(phrase)) {
      // Never a break point, not even a fallback one.
      last[last.length - 1] += phrase;
    } else {
      units.push(pending ? [...pending, phrase] : [phrase]);
    }
    pending = null;
    const current = units[units.length - 1]!;
    if (gluesToNext(current[current.length - 1]!)) pending = units.pop()!;
  }
  if (pending) units.push(pending);

  const tail = units[units.length - 1];
  if (units.length > 1 && tail && tail.join("").replace(/[。、．，！？」』）\s]/g, "").length <= MAX_ORPHAN_LENGTH) {
    units[units.length - 2]!.push(...units.pop()!);
  }
  return units;
}

/**
 * Splits `text` into units that may each start a new line, each unit being
 * the phrases it may fall back to breaking between. Flattening the result
 * always reproduces `text` exactly; a CMS-authored `\n` stays at the end of
 * its phrase so `white-space: pre-line` still honours it.
 */
export function phraseUnits(text: string): string[][] {
  if (!text) return [];
  if (!isJapanese(text)) return [[text]];

  const units: Unit[] = [];
  for (const part of text.split(/(\n)/)) {
    const last = units[units.length - 1];
    if (part === "\n") {
      if (last) last[last.length - 1] += part;
      else units.push([part]);
    } else if (part) {
      units.push(...segmentLine(part));
    }
  }
  return units;
}

/** The line-start positions of `phraseUnits`, one string per unit. */
export function phraseSegments(text: string): string[] {
  return phraseUnits(text).map((unit) => unit.join(""));
}
