import assert from "node:assert/strict";
import test from "node:test";
import { decodeShare, encodeShare, fromBase64Url, MAX_TERMS_PARAM, toBase64Url } from "./share.ts";
import { BUILTIN_ID } from "./terms.ts";

const terms = (n: number, prefix = "Begriff") => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);

test("built-in lists are shared by id and round-trip", () => {
  const encoded = encodeShare({ seed: 987654321, list: { kind: "builtin", id: BUILTIN_ID } });
  assert.ok(encoded.ok);
  if (!encoded.ok) return;
  assert.match(encoded.hash, /^#seed=[0-9a-z]+&list=klischees$/);
  assert.deepEqual(decodeShare(encoded.hash), { ok: true, data: { seed: 987654321, list: { kind: "builtin", id: BUILTIN_ID } } });
  // Without the leading # as well.
  assert.equal(decodeShare(encoded.hash.slice(1)).ok, true);
});

test("small custom lists round-trip as base64url, with umlauts and emoji", () => {
  const list = [...terms(23), "Überraschung! 🎮 „Quote“ & = #"];
  const encoded = encodeShare({ seed: 42, list: { kind: "custom", name: "Runde & Co", terms: list } });
  assert.ok(encoded.ok);
  if (!encoded.ok) return;
  assert.match(encoded.hash, /&terms=[A-Za-z0-9_-]+&name=/);
  const decoded = decodeShare(encoded.hash);
  assert.deepEqual(decoded, { ok: true, data: { seed: 42, list: { kind: "custom", name: "Runde & Co", terms: list } } });
  assert.equal(fromBase64Url(toBase64Url("äöü ß")), "äöü ß");
});

test("too-large custom lists are refused when encoding and decoding", () => {
  const big = terms(200, "Ein ziemlich langer Begriff Nummer");
  const encoded = encodeShare({ seed: 1, list: { kind: "custom", name: "x", terms: big } });
  assert.deepEqual(encoded, { ok: false, error: "tooLarge" });
  const raw = toBase64Url(big.join("\n"));
  assert.ok(raw.length > MAX_TERMS_PARAM);
  assert.deepEqual(decodeShare(`#seed=1&terms=${raw}`), { ok: false, error: "tooLarge" });
  assert.deepEqual(decodeShare(`#seed=1&list=${"a".repeat(5000)}`), { ok: false, error: "tooLarge" });
});

test("invalid share hashes are refused with a reason", () => {
  assert.deepEqual(decodeShare(""), { ok: false, error: "none" });
  assert.deepEqual(decodeShare("#datenschutz"), { ok: false, error: "none" });
  assert.deepEqual(decodeShare("#seed=NOPE&list=klischees"), { ok: false, error: "seed" });
  assert.deepEqual(decodeShare("#seed=zzzzzzzz&list=klischees"), { ok: false, error: "seed" });
  assert.deepEqual(decodeShare("#seed=1"), { ok: false, error: "list" });
  assert.deepEqual(decodeShare("#seed=1&list=unbekannt"), { ok: false, error: "list" });
  assert.deepEqual(decodeShare("#seed=1&terms=***"), { ok: false, error: "terms" });
  // Valid base64url but not valid UTF-8.
  assert.deepEqual(decodeShare("#seed=1&terms=_w"), { ok: false, error: "terms" });
  // Valid text but too few terms.
  assert.deepEqual(decodeShare(`#seed=1&terms=${toBase64Url(terms(10).join("\n"))}`), { ok: false, error: "terms" });
});

test("a missing custom name decodes to an empty name for the UI to localize", () => {
  const decoded = decodeShare(`#seed=1&terms=${toBase64Url(terms(24).join("\n"))}`);
  assert.ok(decoded.ok && decoded.data.list.kind === "custom");
  if (decoded.ok && decoded.data.list.kind === "custom") assert.equal(decoded.data.list.name, "");
});
