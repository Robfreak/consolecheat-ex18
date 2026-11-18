import { BUILTIN_ID } from "./terms.ts";
import { cleanListName, validateTerms } from "./lists.ts";
import { formatSeed, parseSeed } from "./prng.ts";

// Share links live in the URL hash, so nothing is sent to a server:
//   #seed=<base36>&list=klischees                 built-in list by id
//   #seed=<base36>&terms=<base64url>&name=<name>  small custom list, terms joined by "\n" as UTF-8

export const MAX_TERMS_PARAM = 1800;

export type SharedList = { kind: "builtin"; id: string } | { kind: "custom"; name: string; terms: string[] };
export type ShareData = { seed: number; list: SharedList };
export type ShareError = "none" | "seed" | "list" | "terms" | "tooLarge";

export function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(text: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export type EncodeResult = { ok: true; hash: string } | { ok: false; error: "tooLarge" };

export function encodeShare(data: ShareData): EncodeResult {
  const seed = formatSeed(data.seed);
  if (data.list.kind === "builtin") return { ok: true, hash: `#seed=${seed}&list=${encodeURIComponent(data.list.id)}` };
  const terms = toBase64Url(data.list.terms.join("\n"));
  if (terms.length > MAX_TERMS_PARAM) return { ok: false, error: "tooLarge" };
  return { ok: true, hash: `#seed=${seed}&terms=${terms}&name=${encodeURIComponent(data.list.name)}` };
}

export type DecodeResult = { ok: true; data: ShareData } | { ok: false; error: ShareError };

/** Accepts "#seed=…" or "seed=…". Returns error "none" when the hash is not a share link at all. */
export function decodeShare(hash: string, knownLists: readonly string[] = [BUILTIN_ID]): DecodeResult {
  const raw = hash.replace(/^#/, "");
  if (raw.length > MAX_TERMS_PARAM + 200) return { ok: false, error: "tooLarge" };
  const params = new URLSearchParams(raw);
  if (!params.has("seed")) return { ok: false, error: "none" };
  const seed = parseSeed(params.get("seed") ?? "");
  if (seed === null) return { ok: false, error: "seed" };
  const list = params.get("list");
  const terms = params.get("terms");
  if (list !== null && terms === null) {
    if (!knownLists.includes(list)) return { ok: false, error: "list" };
    return { ok: true, data: { seed, list: { kind: "builtin", id: list } } };
  }
  if (terms === null) return { ok: false, error: "list" };
  if (terms.length > MAX_TERMS_PARAM) return { ok: false, error: "tooLarge" };
  const text = fromBase64Url(terms);
  if (text === null) return { ok: false, error: "terms" };
  const check = validateTerms(text.split("\n"));
  if (!check.ok) return { ok: false, error: "terms" };
  const name = cleanListName(params.get("name") ?? "", "");
  return { ok: true, data: { seed, list: { kind: "custom", name, terms: check.terms } } };
}
