import { CELLS, CENTER } from "./card.ts";
import { cleanListName, MAX_LIST_NAME, validateTerms } from "./lists.ts";
import { MAX_SEED } from "./prng.ts";
import { BUILTIN_ID } from "./terms.ts";

// What this page stores.
//
// localStorage key `consolecheat-bingo-v1`:
//
//   {
//     "schema": "consolecheat-bingo",
//     "version": 1,
//     "lists": [{ "id": "l-…", "name": "Meine Liste", "terms": ["…", …] }],
//     "current": { "seed": 123, "list": ListRef, "marks": [0, 6, …], "counted": false },
//     "bingos": 3
//   }
//
// ListRef: { "kind": "builtin", "id": "klischees" } | { "kind": "custom", "id": "l-…" }
//        | { "kind": "shared", "name": "…", "terms": [...] } (a list opened from a link, not saved)

export const STORE_KEY = "consolecheat-bingo-v1";
export const LANG_KEY = "consolecheat-lang";
export const THEME_KEY = "consolecheat-theme";
export const SCHEMA = "consolecheat-bingo";
export const VERSION = 1;
export const MAX_LISTS = 20;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type CustomList = { id: string; name: string; terms: string[] };
export type ListRef = { kind: "builtin"; id: string } | { kind: "custom"; id: string } | { kind: "shared"; name: string; terms: string[] };
export type Current = { seed: number; list: ListRef; marks: number[]; counted: boolean };
export type Store = { lists: CustomList[]; current: Current | null; bingos: number };
export type LoadResult = { store: Store; corrupt: boolean };

export function emptyStore(): Store {
  return { lists: [], current: null, bingos: 0 };
}

function parseList(data: unknown): CustomList | null {
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  if (typeof rec.id !== "string" || !rec.id || rec.id.length > 40) return null;
  if (typeof rec.name !== "string" || !rec.name.trim() || rec.name.length > MAX_LIST_NAME) return null;
  if (!Array.isArray(rec.terms) || !rec.terms.every((t) => typeof t === "string")) return null;
  const check = validateTerms(rec.terms as string[]);
  if (!check.ok || check.terms.length !== rec.terms.length) return null;
  return { id: rec.id, name: cleanListName(rec.name, "?"), terms: check.terms };
}

function parseRef(data: unknown, lists: readonly CustomList[]): ListRef | null {
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  if (rec.kind === "builtin" && rec.id === BUILTIN_ID) return { kind: "builtin", id: BUILTIN_ID };
  if (rec.kind === "custom" && typeof rec.id === "string" && lists.some((l) => l.id === rec.id)) return { kind: "custom", id: rec.id };
  if (rec.kind === "shared" && typeof rec.name === "string" && Array.isArray(rec.terms) && rec.terms.every((t) => typeof t === "string")) {
    const check = validateTerms(rec.terms as string[]);
    if (check.ok && check.terms.length === rec.terms.length) return { kind: "shared", name: rec.name.slice(0, MAX_LIST_NAME), terms: check.terms };
  }
  return null;
}

function parseCurrent(data: unknown, lists: readonly CustomList[]): Current | null {
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  if (typeof rec.seed !== "number" || !Number.isInteger(rec.seed) || rec.seed < 0 || rec.seed > MAX_SEED) return null;
  const list = parseRef(rec.list, lists);
  if (!list) return null;
  if (!Array.isArray(rec.marks)) return null;
  const marks = [...new Set(rec.marks)].filter(
    (m): m is number => typeof m === "number" && Number.isInteger(m) && m >= 0 && m < CELLS && m !== CENTER,
  );
  if (marks.length !== rec.marks.length) return null;
  return { seed: rec.seed, list, marks: marks.sort((a, b) => a - b), counted: rec.counted === true };
}

/** Never throws. Missing key: empty. Bad JSON, foreign schema, other version: empty and corrupt. */
export function parseStore(raw: string | null): LoadResult {
  if (raw == null) return { store: emptyStore(), corrupt: false };
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return { store: emptyStore(), corrupt: true };
    const rec = data as Record<string, unknown>;
    if (rec.schema !== SCHEMA || rec.version !== VERSION) return { store: emptyStore(), corrupt: true };
    let corrupt = false;
    const lists: CustomList[] = [];
    if (Array.isArray(rec.lists)) {
      for (const item of rec.lists.slice(0, MAX_LISTS)) {
        const list = parseList(item);
        if (list && !lists.some((l) => l.id === list.id)) lists.push(list);
        else corrupt = true;
      }
    } else if (rec.lists !== undefined) corrupt = true;
    let current: Current | null = null;
    if (rec.current != null) {
      current = parseCurrent(rec.current, lists);
      if (!current) corrupt = true;
    }
    let bingos = 0;
    if (typeof rec.bingos === "number" && Number.isInteger(rec.bingos) && rec.bingos >= 0) bingos = rec.bingos;
    else if (rec.bingos !== undefined) corrupt = true;
    return { store: { lists, current, bingos }, corrupt };
  } catch {
    return { store: emptyStore(), corrupt: true };
  }
}

export function serializeStore(store: Store): string {
  return JSON.stringify({ schema: SCHEMA, version: VERSION, ...store });
}

export function loadStore(local: StorageLike): LoadResult {
  try {
    return parseStore(local.getItem(STORE_KEY));
  } catch {
    return { store: emptyStore(), corrupt: false };
  }
}

export function saveStore(local: StorageLike, store: Store): boolean {
  try {
    local.setItem(STORE_KEY, serializeStore(store));
    return true;
  } catch {
    return false;
  }
}

/** Removes only `consolecheat-bingo-v1`. Language, theme, and every other key stay. */
export function resetStore(local: StorageLike): boolean {
  try {
    local.removeItem(STORE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function sameRef(a: ListRef, b: ListRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "shared" && b.kind === "shared") return a.name === b.name && a.terms.join("\n") === b.terms.join("\n");
  return (a as { id: string }).id === (b as { id: string }).id;
}

/** Marks the card's first Bingo once; later Bingos on the same card do not count again. */
export function countBingo(store: Store, hasBingo: boolean): Store {
  if (!store.current || !hasBingo || store.current.counted) return store;
  return { ...store, current: { ...store.current, counted: true }, bingos: store.bingos + 1 };
}

export function newListId(now: number, salt: number): string {
  return `l-${now.toString(36)}-${(salt >>> 0).toString(36)}`;
}
