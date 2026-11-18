import { useEffect, useMemo, useRef, useState } from "react";
import { bingoLines, CELLS, CENTER, generateCard, isMarked, moveCursor, toggleMark, winningCells, type Direction } from "./card.ts";
import { CONFETTI_MS, createConfetti, staticConfetti, stepConfetti, type Particle } from "./confetti.ts";
import { drawCard, EXPORT_HEIGHT, EXPORT_WIDTH } from "./draw.ts";
import { createPadPoller, gridKeyAction, isTypingTarget, type Action, type TargetLike } from "./input.ts";
import { MAX_TERM_LENGTH, parseTerms, cleanListName } from "./lists.ts";
import { fill, type Copy, type Lang } from "./messages.ts";
import { formatSeed, freshSeed } from "./prng.ts";
import { decodeShare, encodeShare, type ShareData } from "./share.ts";
import {
  countBingo,
  loadStore,
  MAX_LISTS,
  newListId,
  sameRef,
  saveStore,
  type CustomList,
  type ListRef,
  type LoadResult,
  type Store,
  type StorageLike,
} from "./storage.ts";
import { BUILTIN_ID, builtinTerms } from "./terms.ts";

function browserStore(): StorageLike | null {
  try {
    localStorage.getItem("consolecheat-bingo-v1");
    return localStorage;
  } catch {
    return null;
  }
}

function targetOf(element: Element | EventTarget | null): TargetLike {
  if (!element || !(element instanceof HTMLElement)) return null;
  return {
    tagName: element.tagName,
    type: element instanceof HTMLInputElement ? element.type : undefined,
    isContentEditable: element.isContentEditable,
  };
}

function reducedMotion(): boolean {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function refFromShare(data: ShareData): ListRef {
  return data.list.kind === "builtin" ? { kind: "builtin", id: BUILTIN_ID } : { kind: "shared", name: data.list.name, terms: data.list.terms };
}

/** Opening a share link: keep the marks when it is the card already in progress. */
function applyShare(store: Store, data: ShareData): Store {
  const list = refFromShare(data);
  const cur = store.current;
  if (cur && cur.seed === data.seed && sameRef(cur.list, list)) return store;
  return { ...store, current: { seed: data.seed, list, marks: [], counted: false } };
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Editing = { id: string | null; name: string; text: string };

export function Bingo({ text, lang }: { text: Copy; lang: Lang }) {
  const [local] = useState(browserStore);
  const [initial] = useState(() => {
    const loaded: LoadResult = local ? loadStore(local) : { store: { lists: [], current: null, bingos: 0 }, corrupt: false };
    let store = loaded.store;
    let notice = "";
    const shared = decodeShare(location.hash);
    if (shared.ok) {
      store = applyShare(store, shared.data);
      notice = text.sharedOpened;
    } else if (shared.error !== "none") notice = text.shareErrors[shared.error];
    if (!store.current) store = { ...store, current: { seed: freshSeed(), list: { kind: "builtin", id: BUILTIN_ID }, marks: [], counted: false } };
    return { store, corrupt: loaded.corrupt, notice };
  });
  const [store, setStore] = useState<Store>(initial.store);
  const [corrupt] = useState(initial.corrupt);
  const [notice, setNotice] = useState(initial.notice);
  const [cursor, setCursor] = useState(0);
  const [link, setLink] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const confettiRef = useRef<HTMLCanvasElement | null>(null);
  const confettiFrame = useRef(0);
  const storeRef = useRef(store);
  storeRef.current = store;
  const textRef = useRef(text);
  textRef.current = text;

  const current = store.current ?? { seed: 1, list: { kind: "builtin", id: BUILTIN_ID } as ListRef, marks: [], counted: false };
  const customList: CustomList | undefined =
    current.list.kind === "custom" ? store.lists.find((l) => l.id === (current.list as { id: string }).id) : undefined;
  const terms: readonly string[] =
    current.list.kind === "shared" ? current.list.terms : customList ? customList.terms : builtinTerms[lang];
  const listName =
    current.list.kind === "shared" ? current.list.name || text.sharedName : customList ? customList.name : text.builtinName;
  const card = useMemo(() => generateCard(current.seed, terms), [current.seed, terms]);
  const marks = useMemo(() => new Set(current.marks), [current.marks]);
  const winners = useMemo(() => winningCells(marks), [marks]);
  const lineCount = bingoLines(marks).length;

  function commit(next: Store) {
    storeRef.current = next;
    setStore(next);
    if (local) setSaveFailed(!saveStore(local, next));
    else setSaveFailed(true);
  }

  function setCurrent(seed: number, list: ListRef) {
    commit({ ...storeRef.current, current: { seed, list, marks: [], counted: false } });
  }

  function newCard() {
    const cur = storeRef.current.current;
    setCurrent(freshSeed(), cur?.list ?? { kind: "builtin", id: BUILTIN_ID });
    setLink(null);
    setNotice("");
  }

  function runConfetti() {
    const canvas = confettiRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    cancelAnimationFrame(confettiFrame.current);
    const width = (canvas.width = canvas.clientWidth || 400);
    const height = (canvas.height = canvas.clientHeight || 400);
    const draw = (particles: readonly Particle[]) => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
    };
    const seed = freshSeed();
    if (reducedMotion()) {
      // Static: a single still scatter, removed after a moment. No movement.
      draw(staticConfetti(seed, 40, width, height));
      const id = window.setTimeout(() => ctx.clearRect(0, 0, width, height), CONFETTI_MS);
      confettiFrame.current = id;
      return;
    }
    let particles = createConfetti(seed, 140, width, height);
    const started = performance.now();
    let last = started;
    const tick = (now: number) => {
      particles = stepConfetti(particles, Math.min(48, now - last));
      last = now;
      draw(particles);
      if (now - started < CONFETTI_MS) confettiFrame.current = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, width, height);
    };
    confettiFrame.current = requestAnimationFrame(tick);
  }

  function toggle(index: number) {
    if (index === CENTER) return;
    const s = storeRef.current;
    const cur = s.current;
    if (!cur) return;
    const before = bingoLines(new Set(cur.marks)).length;
    const nextMarks = toggleMark(new Set(cur.marks), index);
    const after = bingoLines(nextMarks).length;
    let next: Store = { ...s, current: { ...cur, marks: [...nextMarks].sort((a, b) => a - b) } };
    next = countBingo(next, after > 0);
    commit(next);
    const term = card[index] ?? "";
    if (after > before) {
      setNotice(after === 1 ? textRef.current.bingo : fill(textRef.current.bingoLines, { n: after }));
      runConfetti();
    } else {
      setNotice(fill(nextMarks.has(index) ? textRef.current.marked : textRef.current.unmarked, { term }));
    }
  }

  function focusCell(index: number) {
    setCursor(index);
    cellRefs.current[index]?.focus();
  }

  function move(direction: Direction) {
    setCursor((at) => {
      const next = moveCursor(at, direction);
      cellRefs.current[next]?.focus();
      return next;
    });
  }

  async function exportPng() {
    try {
      await Promise.all([
        document.fonts.load('600 64px "Outfit"'),
        document.fonts.load('400 26px "Source Sans 3"'),
        document.fonts.load('600 21px "Source Sans 3"'),
      ]);
    } catch {
      // Fallback fonts still give a readable card.
    }
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT_WIDTH;
    canvas.height = EXPORT_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const t = textRef.current;
    drawCard(ctx, {
      title: t.title,
      subtitle: fill(t.pngSubtitle, { list: listName }),
      seedLabel: fill(t.seedLabel, { seed: formatSeed(current.seed) }),
      freeLabel: t.free,
      card,
      marks,
      winners,
      footer: t.pngFooter,
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      download(`consolecheat-bingo-${formatSeed(current.seed)}.png`, blob);
      setNotice(textRef.current.pngDone);
    }, "image/png");
  }

  async function copyLink() {
    const list: ShareData["list"] =
      current.list.kind === "builtin" ? { kind: "builtin", id: BUILTIN_ID } : { kind: "custom", name: listName, terms: [...terms] };
    const encoded = encodeShare({ seed: current.seed, list });
    if (!encoded.ok) {
      setLink(null);
      setNotice(text.linkTooLarge);
      return;
    }
    const url = `${location.origin}${location.pathname}${encoded.hash}`;
    try {
      await navigator.clipboard.writeText(url);
      setLink(url);
      setNotice(text.linkCopied);
    } catch {
      setLink(url);
      setNotice(text.linkManual);
    }
  }

  function run(action: Action) {
    if (action.type === "move") move(action.direction);
    else if (action.type === "toggle") toggle(cursorRef.current);
    else if (action.type === "new") newCard();
    else void exportPng();
  }
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const runRef = useRef(run);
  runRef.current = run;

  // Gamepad: rAF polling with the pollPad pattern (the first poll of a pad only seeds).
  useEffect(() => {
    if (typeof navigator.getGamepads !== "function") return;
    const poller = createPadPoller();
    let frame = 0;
    let running = false;
    const poll = () => {
      const list = [...navigator.getGamepads()];
      const blocked = isTypingTarget(targetOf(document.activeElement));
      for (const action of poller.poll(list, blocked)) runRef.current(action);
      if (list.some(Boolean)) frame = requestAnimationFrame(poll);
      else running = false;
    };
    const begin = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(poll);
    };
    const onDisconnect = (event: GamepadEvent) => poller.forget(event.gamepad.index);
    window.addEventListener("gamepadconnected", begin);
    window.addEventListener("gamepaddisconnected", onDisconnect);
    if (navigator.getGamepads().some(Boolean)) begin();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("gamepadconnected", begin);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
  }, []);

  // A share link pasted into this tab.
  useEffect(() => {
    const onHash = () => {
      const shared = decodeShare(location.hash);
      if (shared.ok) {
        commit(applyShare(storeRef.current, shared.data));
        setNotice(textRef.current.sharedOpened);
      } else if (shared.error !== "none") setNotice(textRef.current.shareErrors[shared.error]);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => cancelAnimationFrame(confettiFrame.current), []);

  // Persist the initial card (from a link or a fresh seed) once.
  useEffect(() => {
    if (local) saveStore(local, storeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectValue = current.list.kind === "builtin" ? "builtin" : current.list.kind === "custom" ? `custom:${current.list.id}` : "shared";
  const check = editing ? parseTerms(editing.text) : null;

  function saveList() {
    if (!editing || !check?.ok) return;
    const s = storeRef.current;
    const name = cleanListName(editing.name, text.defaultListName);
    if (editing.id) {
      const lists = s.lists.map((l) => (l.id === editing.id ? { ...l, name, terms: check.terms } : l));
      const cur = s.current;
      // Changing the list in use starts a fresh card on it.
      const current =
        cur && cur.list.kind === "custom" && cur.list.id === editing.id ? { ...cur, marks: [], counted: false } : cur;
      commit({ ...s, lists, current });
    } else {
      if (s.lists.length >= MAX_LISTS) {
        setNotice(text.listsFull);
        return;
      }
      const id = newListId(Date.now(), freshSeed());
      commit({ ...s, lists: [...s.lists, { id, name, terms: check.terms }] });
    }
    setNotice(fill(text.listSaved, { name }));
    setEditing(null);
  }

  function deleteList(id: string) {
    const s = storeRef.current;
    const list = s.lists.find((l) => l.id === id);
    const cur = s.current;
    const current =
      cur && cur.list.kind === "custom" && cur.list.id === id
        ? { seed: freshSeed(), list: { kind: "builtin", id: BUILTIN_ID } as ListRef, marks: [], counted: false }
        : cur;
    commit({ ...s, lists: s.lists.filter((l) => l.id !== id), current });
    setConfirming(null);
    if (list) setNotice(fill(text.listDeleted, { name: list.name }));
  }

  function saveShared() {
    if (current.list.kind !== "shared") return;
    const s = storeRef.current;
    if (s.lists.length >= MAX_LISTS) {
      setNotice(text.listsFull);
      return;
    }
    const id = newListId(Date.now(), freshSeed());
    const name = cleanListName(current.list.name, text.sharedName);
    const cur = s.current;
    commit({
      ...s,
      lists: [...s.lists, { id, name, terms: [...current.list.terms] }],
      current: cur ? { ...cur, list: { kind: "custom", id } } : cur,
    });
    setNotice(fill(text.listSaved, { name }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="panel rounded-xl px-4 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 basis-56">
            <label htmlFor="bingo-list" className="text-sm font-medium">
              {text.listLabel}
            </label>
            <select
              id="bingo-list"
              className="field mt-1"
              value={selectValue}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "builtin") setCurrent(freshSeed(), { kind: "builtin", id: BUILTIN_ID });
                else if (value.startsWith("custom:")) setCurrent(freshSeed(), { kind: "custom", id: value.slice(7) });
                setLink(null);
              }}
            >
              <option value="builtin">{text.builtinName}</option>
              {store.lists.map((list) => (
                <option key={list.id} value={`custom:${list.id}`}>
                  {list.name}
                </option>
              ))}
              {current.list.kind === "shared" ? <option value="shared">{listName}</option> : null}
            </select>
          </div>
          <button type="button" className="btn btn-primary" aria-keyshortcuts="Triangle" onClick={newCard}>
            {text.newCard}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void copyLink()}>
            {text.copyLink}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void exportPng()}>
            {text.exportPng}
          </button>
          {current.list.kind === "shared" ? (
            <button type="button" className="btn btn-ghost" onClick={saveShared}>
              {text.saveShared}
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-sm text-muted">
          <span className="font-mono">{fill(text.seedLabel, { seed: formatSeed(current.seed) })}</span> ·{" "}
          {fill(text.bingoCount, { n: store.bingos })}
        </p>
        {link ? (
          <div className="mt-2">
            <label htmlFor="bingo-link" className="sr-only">
              {text.linkLabel}
            </label>
            <input id="bingo-link" type="text" className="field font-mono text-xs" readOnly value={link} onFocus={(e) => e.target.select()} />
          </div>
        ) : null}
        {corrupt ? <p className="mt-2 text-sm text-warn">{text.storeCorrupt}</p> : null}
        {saveFailed ? <p className="mt-2 text-sm text-warn">{text.saveFailed}</p> : null}
      </div>

      <div className="card-wrap">
        <div
          role="grid"
          aria-label={text.cardLabel}
          className={`bingo-grid${lineCount > 0 ? " has-bingo" : ""}`}
          onKeyDown={(event) => {
            const action = gridKeyAction(event);
            if (!action || action.type !== "move") return;
            event.preventDefault();
            move(action.direction);
          }}
        >
          {[0, 1, 2, 3, 4].map((row) => (
            <div role="row" key={row} className="contents">
              {[0, 1, 2, 3, 4].map((col) => {
                const index = row * 5 + col;
                const term = card[index];
                const free = index === CENTER;
                const on = isMarked(marks, index);
                return (
                  <div role="gridcell" key={index} className="contents">
                    <button
                      ref={(el) => {
                        cellRefs.current[index] = el;
                      }}
                      type="button"
                      tabIndex={index === cursor ? 0 : -1}
                      aria-pressed={on}
                      aria-disabled={free || undefined}
                      aria-label={free ? text.freeCell : undefined}
                      className={`cell${on ? " is-marked" : ""}${winners.has(index) ? " is-win" : ""}${free ? " is-free" : ""}${index === cursor ? " is-cursor" : ""}`}
                      onFocus={() => setCursor(index)}
                      onClick={() => {
                        focusCell(index);
                        toggle(index);
                      }}
                    >
                      {free ? <span className="font-display text-base font-semibold">★ {text.free}</span> : term}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <canvas ref={confettiRef} className="confetti" aria-hidden="true" />
        {lineCount > 0 ? <p className="bingo-banner font-display">{text.bingo}</p> : null}
      </div>
      <p role="status" aria-live="polite" className="min-h-6 text-sm text-fg">
        {notice}
      </p>

      <section className="panel rounded-xl px-4 py-4" aria-labelledby="lists-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="lists-heading" className="font-display text-lg font-semibold tracking-tight">
            {text.listsHeading}
          </h3>
          {!editing ? (
            <button type="button" className="btn btn-ghost" onClick={() => setEditing({ id: null, name: "", text: "" })}>
              {text.listNew}
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted">{text.listsNote}</p>
        {editing ? (
          <form
            className="mt-3 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveList();
            }}
          >
            <div>
              <label htmlFor="list-name" className="text-sm font-medium">
                {text.listName}
              </label>
              <input
                id="list-name"
                type="text"
                className="field mt-1"
                maxLength={40}
                value={editing.name}
                placeholder={text.defaultListName}
                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="list-terms" className="text-sm font-medium">
                {text.listTerms}
              </label>
              <textarea
                id="list-terms"
                className="field mt-1 min-h-48 py-2"
                value={editing.text}
                aria-describedby="list-check"
                onChange={(event) => setEditing({ ...editing, text: event.target.value })}
              />
              <p id="list-check" className={`mt-1 text-sm ${check?.ok ? "text-ok" : "text-warn"}`} aria-live="polite">
                {fill(text.listCount, { n: check?.terms.length ?? 0 })}
                {check && !check.ok ? ` · ${text.listErrors[check.error]}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary" disabled={!check?.ok}>
                {editing.id ? text.listUpdate : text.listSave}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                {text.cancel}
              </button>
            </div>
          </form>
        ) : null}
        {store.lists.length === 0 ? (
          <p className="mt-3 text-sm text-subtle">{text.noLists}</p>
        ) : (
          <ul className="mt-3">
            {store.lists.map((list) => (
              <li key={list.id} className="list-item">
                {confirming === list.id ? (
                  <div role="alertdialog" aria-label={fill(text.listDeleteAsk, { name: list.name })} className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">{fill(text.listDeleteAsk, { name: list.name })}</span>
                    <button type="button" className="btn btn-bad btn-sm" onClick={() => deleteList(list.id)}>
                      {text.listDelete}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(null)}>
                      {text.cancel}
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="min-w-0 break-words font-medium">
                      {list.name} <span className="text-sm text-subtle">({list.terms.length})</span>
                    </span>
                    <span className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setCurrent(freshSeed(), { kind: "custom", id: list.id });
                          setLink(null);
                        }}
                      >
                        {text.listUse}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditing({ id: list.id, name: list.name, text: list.terms.join("\n") })}
                      >
                        {text.listEdit}
                      </button>
                      <button type="button" className="btn btn-bad btn-sm" onClick={() => setConfirming(list.id)}>
                        {text.listDelete}
                      </button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export const BINGO_LIMITS = { cells: CELLS, maxTermLength: MAX_TERM_LENGTH };
