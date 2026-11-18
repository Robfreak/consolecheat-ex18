import type { Direction } from "./card.ts";

// Keyboard and gamepad mapping. Pure helpers so node:test can check them.

export type Action = { type: "move"; direction: Direction } | { type: "toggle" } | { type: "new" } | { type: "export" };

export type KeyLike = { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean };

/** Keys handled on the grid itself (roving tabindex). Space/Enter toggle the focused square. */
export function gridKeyAction(event: KeyLike): Action | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  switch (event.key) {
    case "ArrowUp":
      return { type: "move", direction: "up" };
    case "ArrowDown":
      return { type: "move", direction: "down" };
    case "ArrowLeft":
      return { type: "move", direction: "left" };
    case "ArrowRight":
      return { type: "move", direction: "right" };
    case "Home":
      return { type: "move", direction: "home" };
    case "End":
      return { type: "move", direction: "end" };
    case " ":
    case "Enter":
      return { type: "toggle" };
    default:
      return null;
  }
}

export type TargetLike = { tagName?: string; type?: string; isContentEditable?: boolean } | null;

const TEXT_INPUTS = new Set(["text", "search", "email", "url", "tel", "password", "number"]);

export function isTypingTarget(target: TargetLike): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = (target.tagName ?? "").toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return TEXT_INPUTS.has((target.type ?? "text").toLowerCase());
  return false;
}

// Standard gamepad mapping (PlayStation labels).
export const PAD = { cross: 0, circle: 1, square: 2, triangle: 3, options: 9, up: 12, down: 13, left: 14, right: 15 } as const;

const BUTTON_ACTIONS: readonly (readonly [number, Action])[] = [
  [PAD.up, { type: "move", direction: "up" }],
  [PAD.down, { type: "move", direction: "down" }],
  [PAD.left, { type: "move", direction: "left" }],
  [PAD.right, { type: "move", direction: "right" }],
  [PAD.cross, { type: "toggle" }],
  [PAD.triangle, { type: "new" }],
  [PAD.options, { type: "export" }],
];
const WATCHED = BUTTON_ACTIONS.map(([index]) => index);

export type PadLike = { index: number; buttons: readonly { pressed: boolean }[] };
export type PadMemory = { buttons: boolean[] };

function snapshot(pad: PadLike): PadMemory {
  const buttons: boolean[] = [];
  for (const index of WATCHED) buttons[index] = Boolean(pad.buttons[index]?.pressed);
  return { buttons };
}

/**
 * One pad, one poll (the pollPad pattern). The first call (no memory) seeds and emits
 * nothing. With `blocked` set (a text field has focus) the memory still follows the pad,
 * so a button held through the block does not fire afterwards.
 */
export function pollPad(
  pad: PadLike | null,
  memory: PadMemory | null,
  blocked = false,
): { actions: Action[]; memory: PadMemory | null } {
  if (!pad) return { actions: [], memory: null };
  const seeded = snapshot(pad);
  if (!memory) return { actions: [], memory: seeded };
  if (blocked) return { actions: [], memory: seeded };
  const actions: Action[] = [];
  for (const [index, action] of BUTTON_ACTIONS) {
    if (seeded.buttons[index] && !memory.buttons[index]) actions.push(action);
  }
  return { actions, memory: seeded };
}

/** Memory per gamepad index. A pad missing from a poll (or forgotten on disconnect) seeds again. */
export function createPadPoller() {
  const memories = new Map<number, PadMemory>();
  return {
    poll(pads: readonly (PadLike | null)[], blocked = false): Action[] {
      const actions: Action[] = [];
      const live = new Set<number>();
      for (const pad of pads) {
        if (!pad) continue;
        live.add(pad.index);
        const result = pollPad(pad, memories.get(pad.index) ?? null, blocked);
        if (result.memory) memories.set(pad.index, result.memory);
        actions.push(...result.actions);
      }
      for (const index of [...memories.keys()]) if (!live.has(index)) memories.delete(index);
      return actions;
    },
    forget(index: number) {
      memories.delete(index);
    },
  };
}
