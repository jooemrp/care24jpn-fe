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

/**
 * Words that depend on the phrase before them and read as a broken word when
 * they open a line (article titles, ClickUp #3): 「1時間/あたりの」,
 * 「依頼する/際の」. After a て/で verb form, an auxiliary verb such as
 * おく/しまう/みる is likewise part of the verb (「知って/おくべき」).
 */
const DEPENDENT_START = /^(?:あたり|際(?![立限])|ごと(?=[のに]))/;
const TE_AUXILIARY = /^(?:おく|おき|おい|しまう|しまい|しまっ|みる|みて|みた|もらう|もらい|もらえ)/;

function gluesToPrevious(previous: string, phrase: string): boolean {
  if (GLUE_TO_PREVIOUS.test(phrase) || DEPENDENT_START.test(phrase)) return true;
  return /[てで]$/.test(previous) && TE_AUXILIARY.test(phrase);
}

/**
 * Words BudouX cuts in two (`一人|暮らし`, `付き添い|サービス`, `手を|抜く`).
 * When a phrase boundary falls inside one of these, the two phrases are
 * joined, so the word never splits. Add to this list rather than to CSS.
 */
const NEVER_SPLIT = ["一人暮らし", "付き添いサービス", "手を抜く"];

function joinSplitWords(phrases: string[]): string[] {
  const out: string[] = [];
  for (const phrase of phrases) {
    const last = out[out.length - 1];
    if (last !== undefined) {
      const joined = last + phrase;
      const crosses = NEVER_SPLIT.some((word) => {
        for (let at = joined.indexOf(word); at !== -1; at = joined.indexOf(word, at + 1)) {
          if (at < last.length && at + word.length > last.length) return true;
        }
        return false;
      });
      if (crosses) {
        out[out.length - 1] = joined;
        continue;
      }
    }
    out.push(phrase);
  }
  return out;
}

/** Longer than this, a phrase gets fallback break points (see {@link fallbackPieces}). */
const LONG_PHRASE = 12;

/**
 * Break points used only when a whole phrase does not fit on one line, so it
 * wraps between words instead of wherever the box ends (「介護保険外サービス
 * 事業者/の」 at 320px): after a 【label】 (`【料金相場】/1時間あたりの`), and,
 * in a phrase over {@link LONG_PHRASE} characters, where a katakana word is
 * followed by a kanji word (`介護保険外サービス/事業者の`). Kanji followed by
 * katakana is never split, so 情報セキュリティ stays whole. The pieces stay
 * in one unit: they move to the next line together whenever they fit.
 */
function fallbackPieces(phrase: string): string[] {
  return phrase
    .split(/(?<=】)(?=.)/)
    .flatMap((piece) => (piece.length > LONG_PHRASE ? piece.split(/(?<=[ァ-ヺー])(?=[一-龯々])/) : [piece]));
}

/**
 * Title separator 「｜」 (`メイン｜サブ`): a line may always break right
 * before it and never right after it, so the subtitle starts its own line
 * when the title wraps instead of 「｜」 sitting mid-line or at a line end.
 */
const TITLE_SEPARATOR = /(?=｜)/;

/** A closing phrase this short would read as an orphan (`1日の|流れ`). */
const MAX_ORPHAN_LENGTH = 2;

/**
 * Endings BudouX sometimes fuses with the next phrase: the case particle
 * にて (`お電話にてお気軽に`, sheet row 33) and the auxiliary べき before a
 * noun (`おくべき両立支援制度`, ClickUp #3), which is otherwise one phrase too
 * long for a phone line.
 */
const SPLIT_AFTER = /(にて|べき)(?=.)/;

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
  const parts = line.split(TITLE_SEPARATOR).filter(Boolean);
  if (parts.length > 1) return parts.flatMap(segmentLine);

  const units: Unit[] = [];
  let pending: Unit | null = null;
  // The last whole phrase, before fallback pieces: glue rules read phrases,
  // so a piece such as 「事業者の」 never counts as a short modifier.
  let lastPhrase = "";
  for (const phrase of joinSplitWords(parser.parse(line).flatMap(splitAfterParticle))) {
    const last = units[units.length - 1];
    if (!pending && last && gluesToPrevious(lastPhrase, phrase)) {
      // Never a break point, not even a fallback one.
      last[last.length - 1] += phrase;
      lastPhrase += phrase;
    } else {
      const pieces = fallbackPieces(phrase);
      units.push(pending ? [...pending, ...pieces] : pieces);
      lastPhrase = phrase;
    }
    pending = null;
    if (gluesToNext(lastPhrase)) pending = units.pop()!;
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
