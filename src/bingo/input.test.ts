import assert from "node:assert/strict";
import test from "node:test";
import { createPadPoller, gridKeyAction, isTypingTarget, PAD, pollPad, type PadLike } from "./input.ts";

function pad(index: number, pressed: number[] = []): PadLike {
  return { index, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })) };
}

test("the first poll of a pad only initializes state, even with buttons held", () => {
  const first = pollPad(pad(0, [PAD.cross, PAD.triangle, PAD.options, PAD.up]), null);
  assert.deepEqual(first.actions, []);
  assert.ok(first.memory);
  // Still held: no edge, no action.
  assert.deepEqual(pollPad(pad(0, [PAD.cross, PAD.triangle, PAD.options, PAD.up]), first.memory).actions, []);
  // Released then pressed again: one action.
  const released = pollPad(pad(0), first.memory);
  assert.deepEqual(pollPad(pad(0, [PAD.cross]), released.memory).actions, [{ type: "toggle" }]);
});

test("the first poll after a reconnect only initializes state", () => {
  const poller = createPadPoller();
  assert.deepEqual(poller.poll([pad(0)]), []);
  assert.deepEqual(poller.poll([pad(0, [PAD.cross])]), [{ type: "toggle" }]);
  // The pad disappears from a poll (unplugged)...
  assert.deepEqual(poller.poll([null]), []);
  // ...and comes back with × held: seed only.
  assert.deepEqual(poller.poll([pad(0, [PAD.cross])]), []);
  assert.deepEqual(poller.poll([pad(0)]), []);
  assert.deepEqual(poller.poll([pad(0, [PAD.triangle])]), [{ type: "new" }]);
  // gamepaddisconnected → forget: the next poll seeds again.
  poller.forget(0);
  assert.deepEqual(poller.poll([pad(0, [PAD.options])]), []);
  // A second pad also seeds on its first poll.
  assert.deepEqual(poller.poll([pad(0, [PAD.options]), pad(1, [PAD.cross])]), []);
});

test("gamepad mapping: D-pad moves, × toggles, △ new card, Options exports", () => {
  const poller = createPadPoller();
  poller.poll([pad(0)]);
  const press = (button: number) => {
    const actions = poller.poll([pad(0, [button])]);
    poller.poll([pad(0)]);
    return actions;
  };
  assert.deepEqual(press(PAD.up), [{ type: "move", direction: "up" }]);
  assert.deepEqual(press(PAD.down), [{ type: "move", direction: "down" }]);
  assert.deepEqual(press(PAD.left), [{ type: "move", direction: "left" }]);
  assert.deepEqual(press(PAD.right), [{ type: "move", direction: "right" }]);
  assert.deepEqual(press(PAD.cross), [{ type: "toggle" }]);
  assert.deepEqual(press(PAD.triangle), [{ type: "new" }]);
  assert.deepEqual(press(PAD.options), [{ type: "export" }]);
  assert.deepEqual(press(PAD.circle), []);
  assert.deepEqual(press(PAD.square), []);
});

test("while a text field is focused, gamepad presses do nothing and do not fire later", () => {
  const poller = createPadPoller();
  poller.poll([pad(0)]);
  assert.deepEqual(poller.poll([pad(0, [PAD.triangle])], true), []);
  // Focus leaves the field with △ still held: no late action.
  assert.deepEqual(poller.poll([pad(0, [PAD.triangle])], false), []);
});

test("keyboard: arrows, Home and End move; Space and Enter toggle; modifiers are ignored", () => {
  assert.deepEqual(gridKeyAction({ key: "ArrowUp" }), { type: "move", direction: "up" });
  assert.deepEqual(gridKeyAction({ key: "ArrowDown" }), { type: "move", direction: "down" });
  assert.deepEqual(gridKeyAction({ key: "ArrowLeft" }), { type: "move", direction: "left" });
  assert.deepEqual(gridKeyAction({ key: "ArrowRight" }), { type: "move", direction: "right" });
  assert.deepEqual(gridKeyAction({ key: "Home" }), { type: "move", direction: "home" });
  assert.deepEqual(gridKeyAction({ key: "End" }), { type: "move", direction: "end" });
  assert.deepEqual(gridKeyAction({ key: " " }), { type: "toggle" });
  assert.deepEqual(gridKeyAction({ key: "Enter" }), { type: "toggle" });
  assert.equal(gridKeyAction({ key: "ArrowUp", ctrlKey: true }), null);
  assert.equal(gridKeyAction({ key: "a" }), null);
});

test("text fields count as typing targets, buttons do not", () => {
  assert.equal(isTypingTarget({ tagName: "INPUT", type: "text" }), true);
  assert.equal(isTypingTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTypingTarget({ tagName: "SELECT" }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: "BUTTON" }), false);
  assert.equal(isTypingTarget({ tagName: "INPUT", type: "checkbox" }), false);
  assert.equal(isTypingTarget(null), false);
});
