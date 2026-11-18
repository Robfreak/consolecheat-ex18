import assert from "node:assert/strict";
import test from "node:test";
import { copy, fill, initialLang } from "./messages.ts";

function shape(value: unknown, path = ""): string[] {
  if (typeof value === "string") return [path];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => shape(child, `${path}.${key}`));
}

function leaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return Object.values(value as Record<string, unknown>).flatMap(leaves);
}

test("German and English have the same keys and no empty strings", () => {
  assert.deepEqual(shape(copy.de).sort(), shape(copy.en).sort());
  for (const lang of ["de", "en"] as const) for (const text of leaves(copy[lang])) assert.ok(text.trim().length > 0, lang);
});

test("placeholders match between languages", () => {
  const de = copy.de as unknown as Record<string, unknown>;
  const en = copy.en as unknown as Record<string, unknown>;
  for (const path of shape(copy.de)) {
    const get = (root: Record<string, unknown>) =>
      path.split(".").slice(1).reduce<unknown>((at, key) => (at as Record<string, unknown>)[key], root) as string;
    const holes = (s: string) => (s.match(/\{[A-Za-z0-9]+\}/g) ?? []).sort();
    assert.deepEqual(holes(get(de)), holes(get(en)), path);
  }
});

test("German is the default and the key copy is present", () => {
  assert.equal(initialLang(null), "de");
  assert.equal(initialLang("en"), "en");
  assert.equal(initialLang("fr"), "de");
  assert.equal(copy.de.bingo, "Bingo!");
  assert.equal(copy.en.bingo, "Bingo!");
  assert.equal(copy.de.newCard, "Neue Karte");
  assert.match(copy.de.storageNote, /consolecheat-bingo-v1/);
  assert.match(copy.en.deleteAsk, /consolecheat-bingo-v1/);
  assert.match(copy.de.linkTooLarge, /zu groß/);
  assert.equal(fill("Seed {seed}", { seed: "abc" }), "Seed abc");
});
