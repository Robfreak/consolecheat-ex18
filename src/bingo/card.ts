import { mulberry32 } from "./prng.ts";

export const SIZE = 5;
export const CELLS = SIZE * SIZE;
export const CENTER = 12;
export const TERMS_PER_CARD = CELLS - 1;

/** A card is 25 squares; the centre (index 12) is the free square and holds null. */
export type Card = (string | null)[];

/** Card order depends only on the seed and on the term list as given (order matters). */
export function generateCard(seed: number, terms: readonly string[]): Card {
  const pool = [...terms];
  if (pool.length < TERMS_PER_CARD) throw new Error("not enough terms");
  const rand = mulberry32(seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i] as string;
    pool[i] = pool[j] as string;
    pool[j] = tmp;
  }
  const picked = pool.slice(0, TERMS_PER_CARD);
  return [...picked.slice(0, CENTER), null, ...picked.slice(CENTER)];
}

/** Indices of a card, the free square included. */
export function cardIndices(card: Card, terms: readonly string[]): number[] {
  return card.map((term) => (term === null ? -1 : terms.indexOf(term)));
}

/** All 12 lines: 5 rows, 5 columns, 2 diagonals. */
export const LINES: readonly (readonly number[])[] = (() => {
  const lines: number[][] = [];
  for (let r = 0; r < SIZE; r++) lines.push(Array.from({ length: SIZE }, (_, c) => r * SIZE + c));
  for (let c = 0; c < SIZE; c++) lines.push(Array.from({ length: SIZE }, (_, r) => r * SIZE + c));
  lines.push(Array.from({ length: SIZE }, (_, i) => i * SIZE + i));
  lines.push(Array.from({ length: SIZE }, (_, i) => i * SIZE + (SIZE - 1 - i)));
  return lines;
})();

/** The free centre always counts as marked. */
export function isMarked(marks: ReadonlySet<number>, index: number): boolean {
  return index === CENTER || marks.has(index);
}

/** Indices of the complete lines (into LINES). */
export function bingoLines(marks: ReadonlySet<number>): number[] {
  const out: number[] = [];
  LINES.forEach((line, i) => {
    if (line.every((index) => isMarked(marks, index))) out.push(i);
  });
  return out;
}

/** Squares that belong to at least one complete line. */
export function winningCells(marks: ReadonlySet<number>): Set<number> {
  const cells = new Set<number>();
  for (const i of bingoLines(marks)) for (const index of LINES[i] ?? []) cells.add(index);
  return cells;
}

export function toggleMark(marks: ReadonlySet<number>, index: number): Set<number> {
  const next = new Set(marks);
  if (index === CENTER || index < 0 || index >= CELLS) return next;
  if (next.has(index)) next.delete(index);
  else next.add(index);
  return next;
}

export type Direction = "up" | "down" | "left" | "right" | "home" | "end";

/** Roving cursor on the 5×5 grid. Stops at the edges. */
export function moveCursor(index: number, direction: Direction): number {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  switch (direction) {
    case "up":
      return row > 0 ? index - SIZE : index;
    case "down":
      return row < SIZE - 1 ? index + SIZE : index;
    case "left":
      return col > 0 ? index - 1 : index;
    case "right":
      return col < SIZE - 1 ? index + 1 : index;
    case "home":
      return row * SIZE;
    case "end":
      return row * SIZE + SIZE - 1;
  }
}
