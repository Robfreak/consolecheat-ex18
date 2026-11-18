import assert from "node:assert/strict";
import test from "node:test";
import { CENTER, generateCard } from "./card.ts";
import { cellSize, drawCard, EXPORT_COLORS, EXPORT_HEIGHT, EXPORT_WIDTH, wrapText, type Ctx2D } from "./draw.ts";
import { builtinTerms } from "./terms.ts";

type Op = { op: string; args: unknown[]; fill: string; font: string };

function mockCtx(): Ctx2D & { ops: Op[] } {
  const ops: Op[] = [];
  const ctx = {
    ops,
    fillStyle: "#000" as Ctx2D["fillStyle"],
    strokeStyle: "#000" as Ctx2D["strokeStyle"],
    lineWidth: 1,
    font: "",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    fillRect(...args: number[]) {
      ops.push({ op: "fillRect", args, fill: String(ctx.fillStyle), font: ctx.font });
    },
    strokeRect(...args: number[]) {
      ops.push({ op: "strokeRect", args, fill: String(ctx.strokeStyle), font: ctx.font });
    },
    fillText(text: string, x: number, y: number) {
      ops.push({ op: "fillText", args: [text, x, y], fill: String(ctx.fillStyle), font: ctx.font });
    },
    measureText(text: string) {
      // Width scales with the font size: half an em per character.
      const px = Number(/(\d+)px/.exec(ctx.font)?.[1] ?? 22);
      return { width: text.length * px * 0.5 };
    },
  };
  return ctx;
}

const card = generateCard(4242, builtinTerms.de);

test("the PNG canvas has fixed, non-empty dimensions", () => {
  assert.equal(EXPORT_WIDTH, 1000);
  assert.equal(EXPORT_HEIGHT, 1200);
  assert.ok(cellSize() > 100);
});

test("the export draws background, title, seed, all terms and the marks", () => {
  const ctx = mockCtx();
  drawCard(ctx, {
    title: "Gaming-Bingo",
    subtitle: "Liste: Gaming-Klischees",
    seedLabel: "Seed 39ju",
    freeLabel: "Frei",
    card,
    marks: new Set([0, 1, 2, 3, 4]),
    winners: new Set([0, 1, 2, 3, 4]),
    footer: "consolecheat · Gaming-Bingo",
  });
  const first = ctx.ops[0];
  assert.deepEqual([first?.op, first?.args, first?.fill], ["fillRect", [0, 0, EXPORT_WIDTH, EXPORT_HEIGHT], EXPORT_COLORS.bg]);
  const texts = ctx.ops.filter((o) => o.op === "fillText").map((o) => o.args[0] as string);
  assert.ok(texts.includes("Gaming-Bingo"));
  assert.ok(texts.includes("Seed 39ju"));
  assert.ok(texts.includes("CONSOLECHEAT"));
  assert.ok(texts.includes("★ Frei"));
  const joined = texts.join("").replace(/\s/g, "");
  for (const term of card) if (term) assert.ok(joined.includes(term.replace(/\s/g, "")), term);
  // Self-hosted fonts by name.
  assert.ok(ctx.ops.some((o) => o.font.includes('"Outfit"')));
  assert.ok(ctx.ops.some((o) => o.font.includes('"Source Sans 3"')));
  // 25 cell backgrounds: 5 marked + centre in accent, the rest surface.
  const cells = ctx.ops.filter((o) => o.op === "fillRect" && o.args[2] === cellSize());
  assert.equal(cells.length, 25);
  assert.equal(cells.filter((o) => o.fill === EXPORT_COLORS.accent).length, 6);
  // Winning line outlined.
  assert.equal(ctx.ops.filter((o) => o.op === "strokeRect" && o.fill === EXPORT_COLORS.win).length, 5);
  assert.equal(card[CENTER], null);
  // All drawing stays on the canvas.
  for (const o of ctx.ops) if (o.op !== "fillText") for (const n of o.args as number[]) assert.ok(n >= 0 && n <= EXPORT_HEIGHT);
});

test("a long single word gets a smaller font instead of being cut", () => {
  const ctx = mockCtx();
  drawCard(ctx, {
    title: "t", subtitle: "s", seedLabel: "Seed 1", freeLabel: "Frei",
    card: generateCard(1, Array.from({ length: 24 }, (_, i) => `Mikrotransaktion${i}`)),
    marks: new Set(), winners: new Set(), footer: "f",
  });
  const cellTexts = ctx.ops.filter((o) => o.op === "fillText" && /^Mikro/.test(o.args[0] as string));
  assert.equal(cellTexts.length, 24, "each 17-letter word stays on one line");
  assert.ok(cellTexts.every((o) => /^Mikrotransaktion\d+$/.test(o.args[0] as string)));
  assert.ok(cellTexts.every((o) => /^600 1[5-9]px/.test(o.font)));
});

test("long terms wrap and are cut to a maximum number of lines", () => {
  const ctx = mockCtx();
  ctx.font = '600 22px "Source Sans 3"';
  const lines = wrapText(ctx, "Ein sehr langer Begriff mit vielen Wörtern darin", 110, 3);
  assert.equal(lines.length, 3);
  for (const line of lines) assert.ok(ctx.measureText(line).width <= 110 + 11, line);
  assert.match(lines[2] ?? "", /…$/);
  assert.deepEqual(wrapText(ctx, "kurz", 200, 3), ["kurz"]);
  assert.ok(wrapText(ctx, "Donaudampfschifffahrtsgesellschaft", 110, 5).every((l) => ctx.measureText(l).width <= 110));
});
