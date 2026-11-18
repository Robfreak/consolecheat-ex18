import assert from "node:assert/strict";
import test from "node:test";
import {
  countBingo,
  emptyStore,
  LANG_KEY,
  loadStore,
  parseStore,
  resetStore,
  saveStore,
  serializeStore,
  STORE_KEY,
  THEME_KEY,
  type Store,
  type StorageLike,
} from "./storage.ts";

function memory(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, String(value)),
    removeItem: (key) => void data.delete(key),
  };
}

const list = { id: "l1", name: "Runde", terms: Array.from({ length: 24 }, (_, i) => `T${i}`) };
const sample: Store = {
  lists: [list],
  current: { seed: 77, list: { kind: "custom", id: "l1" }, marks: [0, 1, 2], counted: false },
  bingos: 3,
};

test("the store key is consolecheat-bingo-v1 with schema and version", () => {
  assert.equal(STORE_KEY, "consolecheat-bingo-v1");
  const json = JSON.parse(serializeStore(sample));
  assert.equal(json.schema, "consolecheat-bingo");
  assert.equal(json.version, 1);
});

test("lists, the current card and the bingo count persist", () => {
  const local = memory();
  assert.equal(saveStore(local, sample), true);
  assert.deepEqual(loadStore(local), { store: sample, corrupt: false });
  const shared: Store = {
    ...sample,
    current: { seed: 5, list: { kind: "shared", name: "Geteilt", terms: list.terms }, marks: [24], counted: true },
  };
  saveStore(local, shared);
  assert.deepEqual(loadStore(local).store, shared);
});

test("corrupt or foreign data falls back without throwing", () => {
  for (const raw of ["{", "null", "[]", "42", '{"schema":"x","version":1}', '{"schema":"consolecheat-bingo","version":2}']) {
    const result = parseStore(raw);
    assert.deepEqual(result.store, emptyStore(), raw);
    assert.equal(result.corrupt, true, raw);
  }
  assert.deepEqual(parseStore(null), { store: emptyStore(), corrupt: false });
  // Bad entries are skipped, good ones kept.
  const mixed = JSON.stringify({
    schema: "consolecheat-bingo",
    version: 1,
    lists: [list, { id: "bad", name: "x", terms: ["too", "few"] }, "nope"],
    current: { seed: -4, list: { kind: "builtin", id: "klischees" }, marks: [], counted: false },
    bingos: "many",
  });
  const result = parseStore(mixed);
  assert.equal(result.corrupt, true);
  assert.deepEqual(result.store.lists, [list]);
  assert.equal(result.store.current, null);
  assert.equal(result.store.bingos, 0);
  // A card with out-of-range marks is dropped as a whole.
  const marks = parseStore(
    JSON.stringify({ schema: "consolecheat-bingo", version: 1, current: { seed: 1, list: { kind: "builtin", id: "klischees" }, marks: [3, 99, 12, -1], counted: false } }),
  );
  assert.equal(marks.store.current, null);
  assert.equal(marks.corrupt, true);
});

test("a throwing storage does not crash loading or saving", () => {
  const broken: StorageLike = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("full");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(loadStore(broken).store.lists.length, 0);
  assert.equal(saveStore(broken, sample), false);
  assert.equal(resetStore(broken), false);
});

test("reset removes only the bingo key", () => {
  const local = memory({ [LANG_KEY]: "en", [THEME_KEY]: "light", "consolecheat-mash-v1": "{}", other: "x" });
  saveStore(local, sample);
  assert.equal(resetStore(local), true);
  assert.equal(local.data.has(STORE_KEY), false);
  assert.deepEqual([...local.data.keys()].sort(), ["consolecheat-lang", "consolecheat-mash-v1", "consolecheat-theme", "other"]);
});

test("a bingo is counted once per card", () => {
  let store = countBingo(sample, true);
  assert.equal(store.bingos, 4);
  store = countBingo(store, true);
  assert.equal(store.bingos, 4);
  assert.equal(countBingo(sample, false).bingos, 3);
});
