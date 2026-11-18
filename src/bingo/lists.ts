import { TERMS_PER_CARD } from "./card.ts";

export const MIN_TERMS = TERMS_PER_CARD; // 24
export const MAX_TERMS = 200;
export const MAX_TERM_LENGTH = 60;
export const MAX_LIST_NAME = 40;

export type ListError = "count" | "length" | "tooMany";
export type ListCheck = { ok: true; terms: string[]; duplicates: number } | { ok: false; error: ListError; terms: string[] };

export function cleanTerm(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** One term per line. Trims, drops empty lines and case-insensitive duplicates, then checks the limits. */
export function parseTerms(text: string): ListCheck {
  return validateTerms(text.split(/\r?\n/));
}

export function validateTerms(raw: readonly string[]): ListCheck {
  const seen = new Set<string>();
  const terms: string[] = [];
  let duplicates = 0;
  for (const line of raw) {
    const term = cleanTerm(line);
    if (!term) continue;
    const key = term.toLocaleLowerCase();
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    terms.push(term);
  }
  if (terms.some((term) => term.length > MAX_TERM_LENGTH)) return { ok: false, error: "length", terms };
  if (terms.length > MAX_TERMS) return { ok: false, error: "tooMany", terms };
  if (terms.length < MIN_TERMS) return { ok: false, error: "count", terms };
  return { ok: true, terms, duplicates };
}

export function cleanListName(raw: string, fallback: string): string {
  return cleanTerm(raw).slice(0, MAX_LIST_NAME) || fallback;
}
