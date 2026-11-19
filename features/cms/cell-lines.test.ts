import assert from "node:assert/strict";
import { test } from "node:test";
import { CELL_BULLET, cellSegments } from "./cell-lines.ts";

test("a cell with no bullet stays one text segment", () => {
  assert.deepEqual(cellSegments("通院の付き添い\n院内の介助"), [{ type: "text", text: "通院の付き添い\n院内の介助" }]);
});

test("consecutive bullet lines become one list; text around it stays in place (ClickUp #5)", () => {
  const text = `頼めないこと\n${CELL_BULLET}庭の草むしり\n${CELL_BULLET}ペットの世話\n※ 例外あり`;
  assert.deepEqual(cellSegments(text), [
    { type: "text", text: "頼めないこと" },
    { type: "ul", items: ["庭の草むしり", "ペットの世話"] },
    { type: "text", text: "※ 例外あり" },
  ]);
});
