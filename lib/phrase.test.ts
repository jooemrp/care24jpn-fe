import assert from "node:assert/strict";
import { test } from "node:test";
import { phraseSegments, phraseUnits } from "./phrase";

/** Joins segments with `/` so a test reads like the client's sheet notation. */
const breaks = (text: string) => phraseSegments(text).join("/");

/** Every client-approved break (`/` in the sheet) must be a phrase boundary. */
function assertBreaksAt(text: string, approved: string): void {
  const boundaries = new Set<number>();
  let offset = 0;
  for (const segment of phraseSegments(text)) boundaries.add((offset += segment.length));

  const pieces = approved.split("/");
  let cursor = 0;
  for (const piece of pieces.slice(0, -1)) {
    cursor += piece.length;
    assert.ok(
      boundaries.has(cursor),
      `expected a phrase boundary after "${text.slice(0, cursor)}" in ${breaks(text)}`,
    );
  }
}

test("approved break positions from sheet (7) are phrase boundaries", () => {
  assertBreaksAt(
    "保険では足りない時間を、有資格者がサポートします。",
    "保険では足りない時間を、/有資格者がサポートします。",
  );
  assertBreaksAt(
    "介護保険では対応しきれないサポートや、ご家族の不安に寄り添うケアを、",
    "介護保険では対応しきれないサポートや、/ご家族の不安に寄り添うケアを、",
  );
  assertBreaksAt(
    "メディカルインフォマティクス株式会社は情報セキュリティマネジメントシステム（ISMS）の国際規格である「ISO27001」を取得しております。",
    "メディカルインフォマティクス株式会社は/情報セキュリティマネジメントシステム（ISMS）の国際規格である/「ISO27001」を取得しております。",
  );
  assertBreaksAt(
    "Care24Japanが、あなたのお困りごとをサポートします。",
    "Care24Japanが、/あなたのお困りごとを/サポートします。",
  );
  assertBreaksAt(
    "※お電話での登録や予約のご対応は午前9時〜午後6時となります。",
    "※お電話での登録や予約のご対応は/午前9時〜午後6時となります。",
  );
  assertBreaksAt("24時間365日お気軽にご相談ください", "24時間365日/お気軽にご相談ください");
  assertBreaksAt(
    "24時間365日、お気軽にお問い合わせください。",
    "24時間365日、/お気軽にお問い合わせください。",
  );
  assertBreaksAt(
    "サービス利用のご相談や空き状況の確認など、お急ぎの場合はお電話がスムーズです。",
    "サービス利用のご相談や空き状況の確認など、/お急ぎの場合はお電話がスムーズです。",
  );
  assertBreaksAt(
    "「仕事に行っている間、見守りをお願いしたい」",
    "「仕事に行っている間、/見守りをお願いしたい」",
  );
  assertBreaksAt(
    "WEBまたはお電話にてお気軽にご相談ください。",
    "WEBまたはお電話にて/お気軽にご相談ください。",
  );
  assertBreaksAt("状態確認・記録作成とご家族への報告", "状態確認・記録作成と/ご家族への報告");
  assertBreaksAt("ご挨拶、お着換え、トイレ介助", "ご挨拶、お着換え、/トイレ介助");
});

test("never breaks inside words the client flagged", () => {
  const flagged: Array<[string, string]> = [
    ["メディカルインフォマティクス株式会社は情報セキュリティマネジメントシステム", "情報セキュリティ"],
    ["WEBまたはお電話にてお気軽にご相談ください。", "お気軽"],
    ["経管栄養（胃ろう）の実施と食後の見守り", "胃ろう"],
    ["おむつ交換と見守り", "見守り"],
    ["※お電話での登録や予約のご対応は午前9時〜午後6時となります。", "午後6時"],
    ["※お電話での登録や予約のご対応は午前9時〜午後6時となります。", "ご対応は"],
    ["24時間365日お気軽にご相談ください", "ご相談"],
    ["1日の流れ", "1日の流れ"],
  ];
  for (const [text, word] of flagged) {
    assert.ok(
      phraseSegments(text).some((segment) => segment.includes(word)),
      `"${word}" was split: ${breaks(text)}`,
    );
  }
});

test("short modifiers stay with the phrase they modify", () => {
  // Sheet (7) rows 29/30/31/33 all keep these pairs on one line.
  assert.match(breaks("24時間365日お気軽にご相談ください"), /お気軽にご相談ください/);
  assert.match(breaks("Care24Japanが、あなたのお困りごとをサポートします。"), /あなたのお困りごとを/);
  assert.match(breaks("ご挨拶、お話、近隣のお散歩、休憩"), /近隣のお散歩、休憩/);
  assert.match(breaks("お急ぎの場合はお電話がスムーズです。"), /お急ぎの場合は/);
  // A long の-phrase is a phrase of its own, not a modifier to glue.
  assert.match(breaks("サービス利用のご相談や"), /サービス利用の\/ご相談や/);
});

test("a glued unit keeps its phrases as fallback break points", () => {
  // Too long for a narrow chip, it may split — but only between phrases.
  assert.deepEqual(phraseUnits("着替えのお手伝い"), [["着替えの", "お手伝い"]]);
  assert.deepEqual(phraseUnits("ご挨拶、お話、近隣のお散歩、休憩").at(-1), ["近隣の", "お散歩、", "休憩"]);
  // An auxiliary ending is never a break point, even as a fallback.
  assert.ok(phraseUnits("午前9時〜午後6時となります。").flat().every((phrase) => !phrase.startsWith("なります")));
});

test("auxiliary endings stay on the line of the word they complete", () => {
  assert.doesNotMatch(breaks("午前9時〜午後6時となります。"), /\/なります/);
  assert.doesNotMatch(breaks("お気軽にお問い合わせください。"), /\/ください/);
});

test("explicit CMS line breaks are preserved verbatim", () => {
  const text = "お支払いは\n銀行振込（前払い）となります。";
  assert.equal(phraseSegments(text).join(""), text);
  assert.ok(phraseSegments(text).some((segment) => segment.endsWith("\n")));
});

test("non-Japanese text passes through as one segment", () => {
  assert.deepEqual(phraseSegments("For details, click here."), ["For details, click here."]);
  assert.deepEqual(phraseSegments(""), []);
});

test("article titles: compounds BudouX cuts in two stay whole (ClickUp #3)", () => {
  const cases: Array<[string, string]> = [
    ["高齢者の見守りサービス完全ガイド｜一人暮らし・同居家族の安心を支える選び方", "一人暮らし"],
    ["高齢の親と外出・旅行を楽しむには？付き添いサービスの活用方法と準備", "付き添いサービス"],
    ["プロに頼ることは「手を抜くこと」ではない", "手を抜く"],
  ];
  for (const [text, word] of cases) {
    assert.ok(phraseUnits(text).flat().some((phrase) => phrase.includes(word)), `"${word}" was split: ${breaks(text)}`);
  }
});

test("dependent words never open a line: あたり, 際, and おく/もらう after a て-form", () => {
  assert.match(breaks("【料金相場】1時間あたりの費用目安"), /1時間あたりの/);
  assert.match(breaks("通院付き添いを依頼する際の事前準備と注意点"), /依頼する際の/);
  assert.match(breaks("会社に頼る！知っておくべき両立支援制度"), /\/知っておくべき\/両立支援制度/);
  assert.match(breaks("スタッフに自宅に来てもらい、"), /来てもらい、/);
  for (const text of ["【料金相場】1時間あたりの費用目安", "通院付き添いを依頼する際の事前準備と注意点", "会社に頼る！知っておくべき両立支援制度"]) {
    assert.ok(phraseUnits(text).flat().every((phrase) => !/^(?:あたり|際|おく)/.test(phrase)), breaks(text));
  }
});

test("the title separator ｜ starts the subtitle's line and never ends a line", () => {
  assert.match(breaks("自費介護サービスの利用方法｜相談から予約・当日までの流れをわかりやすく解説"), /利用方法\/｜相談から/);
  assert.match(breaks("介護保険ではできないこと一覧｜家事・外出・付き添いを頼みたいときの選択肢"), /こと一覧\/｜家事/);
  for (const text of ["安心できるプロの基準｜自費サービスを選定する5つのポイント", "高齢者の見守りサービス完全ガイド｜一人暮らし・同居家族の安心を支える選び方"]) {
    assert.ok(phraseUnits(text).flat().every((phrase) => !phrase.endsWith("｜")), breaks(text));
  }
});

test("a phrase too long for a phone line gets fallback breaks between words, kept in one unit", () => {
  // 13 characters: wider than a 320px heading line; without a fallback the box broke before の.
  assert.deepEqual(phraseUnits("後悔しない！介護保険外サービス事業者の選び方と利用手順")[1], ["介護保険外サービス", "事業者の"]);
  // After a 【label】 only as a fallback, so 【目的別】自費の stays one unit.
  assert.deepEqual(phraseUnits("【目的別】自費の外出サポート活用シーン")[0], ["【目的別】", "自費の"]);
  // Kanji followed by katakana is never split (client-flagged 情報セキュリティ).
  assert.ok(phraseUnits("情報セキュリティマネジメントシステム").flat().some((p) => p.includes("情報セキュリティ")));
});
