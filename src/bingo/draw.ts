import { CELLS, CENTER, SIZE, type Card } from "./card.ts";

// Draws the card for the PNG export. Works on any 2D-context-like object, so the
// layout can be tested in node with a recording mock.

export const EXPORT_WIDTH = 1000;
export const EXPORT_HEIGHT = 1200;
const PAD = 60;
const GRID_TOP = 230;
const GAP = 10;

export const EXPORT_COLORS = {
  bg: "#07090e",
  surface: "#10141c",
  raised: "#171c27",
  line: "#2a3344",
  fg: "#f3f5f8",
  muted: "#a7b0c0",
  accent: "#0070d1",
  steel: "#7eb6ff",
  win: "#d2b48a",
} as const;

export type Ctx2D = {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
};

export type DrawOptions = {
  title: string;
  subtitle: string;
  seedLabel: string;
  freeLabel: string;
  card: Card;
  marks: ReadonlySet<number>;
  winners: ReadonlySet<number>;
  footer: string;
};

export function cellSize(): number {
  return (EXPORT_WIDTH - 2 * PAD - (SIZE - 1) * GAP) / SIZE;
}

/** Greedy word wrap; long words are cut by characters. At most `maxLines`, the last gets "…". */
export function wrapText(ctx: Pick<Ctx2D, "measureText">, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  const push = (value: string) => lines.push(value);
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) push(line);
    let rest = word;
    while (ctx.measureText(rest).width > maxWidth && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && ctx.measureText(rest.slice(0, cut)).width > maxWidth) cut--;
      push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  if (line) push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]?.replace(/.$/, "")}…`;
  return kept;
}

export function drawCard(ctx: Ctx2D, options: DrawOptions): void {
  const c = EXPORT_COLORS;
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  ctx.fillStyle = c.accent;
  ctx.fillRect(0, 0, EXPORT_WIDTH, 8);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = c.steel;
  ctx.font = '600 22px "Source Sans 3", sans-serif';
  ctx.fillText("CONSOLECHEAT", PAD, 80);
  ctx.fillStyle = c.fg;
  ctx.font = '600 64px "Outfit", sans-serif';
  ctx.fillText(options.title, PAD, 150);
  ctx.fillStyle = c.muted;
  ctx.font = '400 26px "Source Sans 3", sans-serif';
  ctx.fillText(options.subtitle, PAD, 195);
  ctx.textAlign = "right";
  ctx.fillText(options.seedLabel, EXPORT_WIDTH - PAD, 195);

  const size = cellSize();
  for (let i = 0; i < CELLS; i++) {
    const x = PAD + (i % SIZE) * (size + GAP);
    const y = GRID_TOP + Math.floor(i / SIZE) * (size + GAP);
    const marked = i === CENTER || options.marks.has(i);
    const win = options.winners.has(i);
    ctx.fillStyle = marked ? c.accent : c.surface;
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = win ? c.win : c.line;
    ctx.lineWidth = win ? 8 : 2;
    ctx.strokeRect(x, y, size, size);
    ctx.fillStyle = marked ? "#ffffff" : c.fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const term = options.card[i];
    if (term === null || term === undefined) {
      ctx.font = '600 34px "Outfit", sans-serif';
      ctx.fillText(`★ ${options.freeLabel}`, x + size / 2, y + size / 2);
      continue;
    }
    // Shrink the font until every word fits on one line, so words are rarely cut.
    let px = 21;
    for (; px > 15; px--) {
      ctx.font = `600 ${px}px "Source Sans 3", sans-serif`;
      if (term.split(" ").every((word) => ctx.measureText(word).width <= size - 20)) break;
    }
    ctx.font = `600 ${px}px "Source Sans 3", sans-serif`;
    const lines = wrapText(ctx, term, size - 20, 5);
    const lineHeight = Math.round(px * 1.2);
    const top = y + size / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, n) => ctx.fillText(line, x + size / 2, top + n * lineHeight));
    if (marked) {
      ctx.font = '600 22px "Source Sans 3", sans-serif';
      ctx.fillText("✓", x + size - 18, y + 20);
    }
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = c.muted;
  ctx.font = '400 22px "Source Sans 3", sans-serif';
  ctx.fillText(options.footer, PAD, EXPORT_HEIGHT - 50);
}
