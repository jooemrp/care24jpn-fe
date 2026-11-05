import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { gtmSnippet } from "./analytics";

function run(search: string, cookie = "", ls: Record<string, string> = {}) {
  const inserted: string[] = [];
  const doc = {
    cookie,
    getElementsByTagName: () => [{ parentNode: { insertBefore: (el: { src: string }) => inserted.push(el.src) } }],
    createElement: () => ({ src: "" }),
  };
  const win: Record<string, unknown> = {
    location: { search, protocol: "https:" },
    localStorage: { getItem: (k: string) => ls[k] ?? null, setItem: (k: string, v: string) => { ls[k] = v; } },
  };
  vm.runInNewContext(gtmSnippet("GTM-X"), { window: win, document: doc, URLSearchParams, Date });
  return { inserted, doc, ls };
}

test("normal visitor loads GTM", () => {
  assert.equal(run("").inserted.length, 1);
});
test("?staff=1 flags browser and skips GTM", () => {
  const r = run("?staff=1");
  assert.equal(r.inserted.length, 0);
  assert.match(r.doc.cookie, /c24_staff=1/);
  assert.equal(r.ls.c24_staff, "1");
});
test("flagged browser skips GTM on later visits", () => {
  assert.equal(run("", "c24_staff=1").inserted.length, 0);
  assert.equal(run("", "", { c24_staff: "1" }).inserted.length, 0);
});
