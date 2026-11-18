import assert from "node:assert/strict";
import test from "node:test";
import { cleanListName, MAX_LIST_NAME, MAX_TERM_LENGTH, MAX_TERMS, MIN_TERMS, parseTerms, validateTerms } from "./lists.ts";

const terms = (n: number) => Array.from({ length: n }, (_, i) => `Begriff ${i + 1}`);

test("one term per line; blank lines, spaces and case-insensitive duplicates are dropped", () => {
  const text = `  Begriff 1  \n\n${terms(24).join("\n")}\nBEGRIFF 2\n   \nZwei   Leer  zeichen`;
  const check = parseTerms(text);
  assert.equal(check.ok, true);
  assert.equal(check.terms.length, 25);
  assert.ok(check.terms.includes("Zwei Leer zeichen"));
  if (check.ok) assert.equal(check.duplicates, 2);
  assert.equal(new Set(check.terms.map((t) => t.toLowerCase())).size, check.terms.length);
});

test("at least 24 unique non-empty terms are required", () => {
  assert.equal(MIN_TERMS, 24);
  const few = parseTerms(terms(23).join("\n"));
  assert.deepEqual([few.ok, few.ok ? "" : few.error], [false, "count"]);
  // 24 lines but one duplicate is still too few.
  const dup = validateTerms([...terms(23), "begriff 1"]);
  assert.equal(dup.ok, false);
  assert.equal(validateTerms(terms(24)).ok, true);
  assert.equal(parseTerms("").ok, false);
});

test("terms are capped in length and count", () => {
  const long = validateTerms([...terms(23), "x".repeat(MAX_TERM_LENGTH + 1)]);
  assert.deepEqual([long.ok, long.ok ? "" : long.error], [false, "length"]);
  assert.equal(validateTerms([...terms(23), "x".repeat(MAX_TERM_LENGTH)]).ok, true);
  const many = validateTerms(terms(MAX_TERMS + 1));
  assert.deepEqual([many.ok, many.ok ? "" : many.error], [false, "tooMany"]);
  assert.equal(validateTerms(terms(MAX_TERMS)).ok, true);
});

test("list names are trimmed, capped and fall back", () => {
  assert.equal(cleanListName("  Meine   Runde ", "x"), "Meine Runde");
  assert.equal(cleanListName("   ", "Meine Liste"), "Meine Liste");
  assert.equal(cleanListName("n".repeat(90), "x").length, MAX_LIST_NAME);
});
