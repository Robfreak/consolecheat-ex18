import assert from "node:assert/strict";
import test from "node:test";
import { bingoLines, CELLS, CENTER, generateCard, isMarked, LINES, moveCursor, toggleMark, winningCells } from "./card.ts";
import { formatSeed, parseSeed, MAX_SEED, freshSeed } from "./prng.ts";
import { builtinTerms } from "./terms.ts";

const all = new Set(Array.from({ length: CELLS }, (_, i) => i));

test("the same seed and list always give the same card; other seeds differ", () => {
  const a = generateCard(12345, builtinTerms.de);
  const b = generateCard(12345, builtinTerms.de);
  assert.deepEqual(a, b);
  assert.notDeepEqual(generateCard(12346, builtinTerms.de), a);
  // Parallel DE/EN lists: the same seed picks the same clichés in both languages.
  const en = generateCard(12345, builtinTerms.en);
  for (let i = 0; i < CELLS; i++) {
    if (i === CENTER) continue;
    assert.equal(builtinTerms.en.indexOf(en[i] as string), builtinTerms.de.indexOf(a[i] as string));
  }
});

test("cards have 25 cells, a free centre and no duplicate terms, over many seeds", () => {
  for (let seed = 0; seed < 300; seed++) {
    const card = generateCard(seed * 7919 + 1, builtinTerms.en);
    assert.equal(card.length, CELLS);
    assert.equal(card[CENTER], null);
    const terms = card.filter((t): t is string => t !== null);
    assert.equal(terms.length, 24);
    assert.equal(new Set(terms).size, 24);
    for (const term of terms) assert.ok(builtinTerms.en.includes(term));
  }
});

test("a list with fewer than 24 terms is refused", () => {
  assert.throws(() => generateCard(1, builtinTerms.de.slice(0, 23)));
  assert.doesNotThrow(() => generateCard(1, builtinTerms.de.slice(0, 24)));
});

test("built-in lists have at least 40 unique terms in both languages, in parallel", () => {
  for (const lang of ["de", "en"] as const) {
    const list = builtinTerms[lang];
    assert.ok(list.length >= 40, lang);
    assert.equal(new Set(list.map((t) => t.toLowerCase())).size, list.length, lang);
    for (const t of list) assert.ok(t.trim() === t && t.length > 0 && t.length <= 60, t);
  }
  assert.equal(builtinTerms.de.length, builtinTerms.en.length);
});

test("there are 12 lines: 5 rows, 5 columns, 2 diagonals", () => {
  assert.equal(LINES.length, 12);
  const keys = new Set(LINES.map((line) => line.join(",")));
  assert.equal(keys.size, 12);
  assert.ok(keys.has("0,1,2,3,4") && keys.has("20,21,22,23,24"));
  assert.ok(keys.has("0,5,10,15,20") && keys.has("4,9,14,19,24"));
  assert.ok(keys.has("0,6,12,18,24") && keys.has("4,8,12,16,20"));
});

test("each of the 12 lines is detected alone, with the free centre counting", () => {
  LINES.forEach((line, n) => {
    const marks = new Set(line.filter((i) => i !== CENTER));
    assert.deepEqual(bingoLines(marks), [n], line.join(","));
    assert.deepEqual([...winningCells(marks)].sort((a, b) => a - b), [...line].sort((a, b) => a - b));
  });
});

test("near misses (any line minus one non-centre square) are not a bingo", () => {
  for (const line of LINES) {
    for (const missing of line) {
      if (missing === CENTER) continue;
      const marks = new Set(line.filter((i) => i !== missing && i !== CENTER));
      assert.deepEqual(bingoLines(marks), [], `${line.join(",")} without ${missing}`);
    }
  }
  assert.deepEqual(bingoLines(new Set()), []);
  // A full card has every line.
  assert.equal(bingoLines(all).length, 12);
});

test("the centre is always marked and cannot be toggled", () => {
  assert.equal(isMarked(new Set(), CENTER), true);
  assert.equal(toggleMark(new Set(), CENTER).has(CENTER), false);
  const once = toggleMark(new Set(), 3);
  assert.ok(once.has(3));
  assert.equal(toggleMark(once, 3).has(3), false);
});

test("the cursor moves within the grid and stops at its edges", () => {
  assert.equal(moveCursor(0, "left"), 0);
  assert.equal(moveCursor(0, "up"), 0);
  assert.equal(moveCursor(0, "right"), 1);
  assert.equal(moveCursor(0, "down"), 5);
  assert.equal(moveCursor(24, "right"), 24);
  assert.equal(moveCursor(24, "down"), 24);
  assert.equal(moveCursor(4, "right"), 4, "no wrap to the next row");
  assert.equal(moveCursor(13, "home"), 10);
  assert.equal(moveCursor(11, "end"), 14);
});

test("seeds round-trip through base36 and bad seeds are refused", () => {
  for (const seed of [0, 1, 35, 36, 123456789, MAX_SEED, freshSeed()]) assert.equal(parseSeed(formatSeed(seed)), seed);
  for (const bad of ["", "-1", "ABC", "1.5", "zzzzzzzz", "zzzzzzz", "a b"]) assert.equal(parseSeed(bad), null, bad);
});
