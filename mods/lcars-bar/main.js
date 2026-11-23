// lcars-bar: the bar (board | terminals view, workspace tabs, Files / Changes panel toggles, window buttons)
// painted as LCARS pills. Contracts: shared "lcars.view" + the layout stack "view" move
// together; panels toggle the layout column "side" and stack "side-body".
import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, focused as focusedNow, run, openOverlay, closeOverlay, window, shared, setShared, layout, nextCommand, settings, exec, notify } from "herdr";

const DIR = "mods/lcars-bar";
// dark = classic LCARS on black; light = the same pills on Solarized-light paper (see lcars-frame for the palette notes)
const DARK = { C: { ground: "#000000", ink: "#000000", orange: "#ff9900", gold: "#ffcc66", tan: "#ffcc99", violet: "#9999ff", blue: "#99ccff", red: "#ff5544", gray: "#666688" },
  T: { tan: "#ffcc99" } };
const LIGHT = { C: { ground: "#fdf6e3", ink: "#000000", orange: "#ff9900", gold: "#f0be3c", tan: "#e6b98a", violet: "#9494f5", blue: "#7db9ee", red: "#f2594a", gray: "#8c8ca8" },
  T: { tan: "#586e75" } };
let C = DARK.C, T = DARK.T, STATUS;
function pal() {
  ({ C, T } = settings()?.dark === false ? LIGHT : DARK);
  STATUS = { working: C.blue, blocked: C.red, done: C.gold, idle: C.violet };
}
pal();
const up = (s) => String(s ?? "").toUpperCase();
const two = (n) => String(n).padStart(2, "0");

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// Light/dark switch (the button lives in lcars-frame's bottom elbow and sends "lcars-bar.appearance"; so does ⌘⇧M): Herdr's `appearance` setting picks which half of the layout's { light, dark } theme shows.
// Flip it in ~/.config/herdr-app/settings.json: this REWRITES that whole file (parsed and re-serialised as JSON, key order kept, indent 2) and touches it so the app reloads it.
const FLIP = `import json,os
p=os.path.expanduser("~/.config/herdr-app/settings.json")
d=json.load(open(p)); d["appearance"]="light" if d.get("appearance","dark")=="dark" else "dark"
open(p,"w").write(json.dumps(d,indent=2)+"\\n")
os.utime(p,follow_symlinks=False)`;
const toggleAppearance = () => exec("python3", ["-c", FLIP]).catch(() => {});

// The board hides every terminal pane, so the focused pane disappears and Herdr's `{ agent: "focused" }` block falls
// back to "the first agent" (always in the first space) and the app follows it there: select another space, press BOARD,
// back to the first space. Pinning the choice with agent.focus on an agent of the selected space before switching avoids that.
function pinAgentInSpace() {
  const space = spaces().find((s) => s.active);
  if (!space) return;
  const mine = new Set(space.tabs.map((t) => t.id));
  const here = panes().filter((p) => p.terminal && mine.has(p.tab));
  if (!here.length) return;
  const cur = focusedNow()?.terminal;
  const tab = space.tabs.find((t) => t.active);
  const pick = here.find((p) => p.terminal === cur) ?? here.find((p) => p.tab === tab?.id) ?? here[0];
  run("agent.focus", { terminal: pick.terminal });
}

function setView(v, cx) {
  setShared("lcars.view", v);
  if (v === "terminals") return run("layout.select", { stack: "view", child: v });
  pinAgentInSpace(); // board and ship both hide the terminal panes
  // let the pin land before the terminals are hidden, or the app has already fallen back to the first agent
  cx.timer.after(150, () => run("layout.select", { stack: "view", child: v }));
}

// Same panel again hides the side column; otherwise show + select.
function togglePanel(name) {
  const body = find(layout(), "side-body"), side = find(layout(), "side");
  if (side && !side.hidden && body?.active === name) {
    run("layout.hide", { id: "side" });
    setShared("lcars.panel", null);
  } else {
    run("layout.show", { id: "side" });
    run("layout.select", { stack: "side-body", child: name });
    setShared("lcars.panel", name);
  }
}

// ---- quick terminal ("TERM") ----
// One long-lived shell per folder (shared "lcars.term.map"), started through Herdr and then parked so it has no pane: it never shows on the board, in a
// tab or in the crew list. TERM shows it in a window overlay (header mod lcars-term + a { terminal } block), centred
// over the work area so it stays clear of the sidebar. Hiding only closes the window; the shell keeps running.
const TERM_W = 1100, TERM_TOP = 120;
const herdr = (...args) => exec("sh", ["-c", 'PATH="$HOME/.local/bin:/usr/local/bin:$PATH"; exec herdr-app "$@"', "sh", ...args]);
const live = async (addr) => {
  const r = await exec("sh", ["-c", 'PATH="$HOME/.local/bin:/usr/local/bin:$PATH"; hc get "$1"', "sh", addr]).catch(() => null);
  try { return JSON.parse(r.stdout).state === "live"; } catch { return false; }
};
const pause = (cx, ms) => new Promise((done) => cx.timer.after(ms, done));

export default class LcarsBar extends View {
  init(_props, cx) {
    this.pressed = null;
    setShared("lcars.term.open", false); // windows do not survive a reload or restart, so start closed
    this.termSeen = false; // the quick terminal has held the keyboard since it opened
    // hide the quick terminal once focus leaves it, unless pinned
    cx.timer.every(300, () => {
      if (!this.termOverlay || shared("lcars.term.open") !== true || shared("lcars.term.pinned") === true) return;
      if (focusedNow()?.terminal === shared("lcars.term.addr")) this.termSeen = true;
      else if (this.termSeen) this.hideTerm();
    });
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        // Accept "view:board", "view board" and a tolerated "lcars-bar." prefix.
        const [kind, val] = c.replace(/^lcars-bar[.:]/, "").split(/[:\s]+/);
        if (kind === "view" && (val === "ship" || val === "board" || val === "terminals")) setView(val, cx);
        else if (kind === "appearance") toggleAppearance();
        else if (kind === "term") this.toggleTerm(cx);
        else if (kind === "panel" && (val === "files" || val === "changes")) togglePanel(val);
        cx.notify();
      }
    });
  }

  hideTerm() {
    if (this.termOverlay) closeOverlay(this.termOverlay);
    this.termOverlay = null; this.termSeen = false;
    setShared("lcars.term.open", false);
  }

  async toggleTerm(cx) {
    if (this.busy) return;
    if (shared("lcars.term.open") === true && this.termOverlay) return this.hideTerm();
    this.busy = true;
    try {
      // one shell per folder: the folder of the focused pane (a pane's cwd follows its shell), else the space's
      const space = spaces().find((s) => s.active), f = focusedNow();
      if (space?.machine) { notify({ title: "TERM is local only", body: `${space.name} runs on ${space.machine}`, level: "info" }); return; }
      const folder = (f?.pane ? panes().find((p) => p.pane === f.pane)?.cwd : null) || f?.cwd || space?.folder;
      if (!folder) return;
      const map = { ...(shared("lcars.term.map") ?? {}) };
      let addr = map[folder];
      if (!addr || !(await live(addr))) {
        // first press for this folder (or its shell died): start one there as a tab, take its pane away, go back to the tab we were on
        const tab = space?.tabs.find((t) => t.active)?.id;
        const made = await herdr("do", "terminal.open", "--name", `quick · ${folder.split("/").filter(Boolean).pop() ?? "/"}`, "--folder", folder);
        addr = JSON.parse(made.stdout).terminal;
        await herdr("do", "terminal.park", "--terminal", addr);
        if (tab) run("tab.select", { id: tab });
        map[folder] = addr;
        setShared("lcars.term.map", map);
        await pause(cx, 400);
      }
      setShared("lcars.term.addr", addr); // the one on screen: what the auto-hide watches
      // centre it over the work area: right of the sidebar (210) with at least 60px clear on each side
      const free = Math.max(400, (this.barW ?? 1400) - 24), width = Math.min(TERM_W, free - 120);
      const x = 210 + 12 + Math.round((free - width) / 2);
      this.termOverlay = openOverlay({ kind: "window", key: "quick-terminal", width, height: 0.6, at: { x, y: TERM_TOP },
        layout: { id: "term", type: "column", children: [
          { id: "term-head", type: "block", size: { px: 36 }, content: { mod: "lcars-term", props: { folder } } },
          { id: "term-body", type: "block", content: { terminal: addr } } ] } });
      setShared("lcars.term.open", true);
      this.termSeen = false; // set once you click into the terminal; leaving it after that hides the window
    } catch (e) {
      this.hideTerm();
    } finally { this.busy = false; }
  }

  render() {
    pal();
    const w = window();
    const mac = w?.platform === "macos";
    const root = layout(), side = find(root, "side"), body = find(root, "side-body");
    const view = ["ship", "board"].includes(shared("lcars.view")) ? shared("lcars.view") : "terminals";
    const space = spaces().find((p) => p.active);
    const shown = space?.tabs ?? [];
    const stop = (_e, cx) => cx.stop_propagation();
    const pill = (id) => div().id(id).h_full().flex_none().flex().items_center().rounded(15).text_color(C.ink).font_weight(700).cursor_pointer();

    // ship | board | terminals: the lit one is orange, the other grey (violet on hover)
    const keys = mac ? { ship: "⌘⇧S", board: "⌘⇧B", terminals: "⌘⇧T" } : { ship: "CTRL-SHIFT-S", board: "CTRL-SHIFT-B", terminals: "CTRL-SHIFT-T" };
    const showHint = shown.length <= 3 && !(side && !side.hidden); // no width API: drop hints when tabs compete for room
    const segment = (id) => {
      const on = view === id;
      return pill(`view-${id}`).px(14).gap(8).text_size(14).bg(on ? C.orange : C.gray)
        .hover((s) => s.bg(on ? C.orange : C.violet))
        .on_mouse_down("left", stop).on_click((_e, cx) => setView(id, cx))
        .child(up(id))
        .when(showHint, (el) => el.child(div().text_size(10).child(keys[id])));
    };
    const control = h_flex().id("view-control").h_full().flex_none().gap(4).child(segment("ship")).child(segment("board")).child(segment("terminals"));

    // workspace tabs: a pill coloured by what the agent in it is doing; the active one is always orange
    const item = (c, i) => {
      const program = panes().find((p) => p.tab === c.id && p.program?.agent)?.program ?? panes().find((p) => p.tab === c.id)?.program;
      const name = /^tb\d+$/.test(c.name) ? program?.name ?? "terminal" : c.name;
      return pill(`tab-${c.id}`).px(14).gap(8).text_size(14).bg(c.active ? C.orange : STATUS[c.status] ?? C.tan)
        .hover((s) => s.opacity(0.85))
        .when(c.status === "blocked" && !c.active, (el) => el.loop("opacity", { from: 0.5, to: 1, period: 800 }))
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_up("left", () => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex((x) => x.id === c.id) + 1 });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }); })
        .child(div().max_w(140).truncate().child(`${two(i + 1)} ${up(c.zoomed ? `${name} z` : name)}`))
        .when(c.active, (el) => el.child(div().id(`close-${c.id}`).on_mouse_down("left", stop)
          .on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); }).child(svg(`${DIR}/close.svg`).size(12).text_color(C.ink))));
    };
    // No width API: show at most MAX pills around the active tab; the rest sit behind "‹ n" / "n ›"
    // pills that step to the previous / next tab, so the active tab is always visible.
    const sideOpen = Boolean(side && !side.hidden);
    const MAX = sideOpen ? 4 : 6;
    const ai = Math.max(0, shown.findIndex((c) => c.active));
    const start = Math.min(Math.max(0, ai - Math.floor(MAX / 2)), Math.max(0, shown.length - MAX));
    const visible = shown.slice(start, start + MAX);
    const more = (id, label, action) => pill(id).px(12).text_size(13).bg(C.gray).hover((s) => s.bg(C.violet))
      .on_mouse_down("left", stop).on_click(action).child(label);
    // board scope: the board follows the selected space; ALL SPACES shows every card (read by lcars-board)
    const scope = shared("lcars.board.scope") === "all" ? "all" : "space";
    const mine = new Set(shown.map((t) => t.id));
    const cards = panes().filter((p) => p.terminal && (scope === "all" || mine.has(p.tab))).length;
    const scopeButton = (id, label) => {
      const on = scope === id;
      return pill(`scope-${id}`).px(14).text_size(14).bg(on ? C.orange : C.gray).hover((s) => s.bg(on ? C.orange : C.violet))
        .on_mouse_down("left", stop).on_click(() => setShared("lcars.board.scope", id)).child(label);
    };
    const middle = view === "terminals"
      ? h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().gap(6).overflow_x_scrollbar()
          .when(start > 0, (el) => el.child(more("tabs-before", `‹ ${start}`, () => run("tab.prev"))))
          .children(visible.map((c, k) => item(c, start + k)))
          .when(start + MAX < shown.length, (el) => el.child(more("tabs-after", `${shown.length - start - MAX} ›`, () => run("tab.next"))))
          .child(pill("tab-new").px(14).text_size(22).bg(C.gray).hover((s) => s.bg(C.violet))
            .on_mouse_down("left", stop).on_click(() => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 })).child("+"))
      : h_flex().flex_1().min_w(0).h_full().items_center().gap(6)
          .child(scopeButton("space", "THIS SPACE")).child(scopeButton("all", "ALL SPACES"))
          .child(div().pl(6).text_size(13).font_weight(700).text_color(T.tan).child(`${two(cards)} CARDS`));

    // panel toggles: lit = orange
    const panelButton = (id, icon) => {
      const on = side && !side.hidden && body?.active === id;
      return pill(`panel-${id}`).px(12).gap(6).text_size(13).bg(on ? C.orange : C.gray)
        .hover((s) => s.bg(on ? C.orange : C.violet))
        .on_mouse_down("left", stop).on_click(() => togglePanel(id))
        .child(svg(`${DIR}/${icon}`).size(14).text_color(C.ink)).child(up(id));
    };

    const win = w?.platform === "windows";
    const button = (id, label, action) => pill(id).w(30).justify_center().text_size(16).bg(C.gray).hover((s) => s.bg(C.violet))
      .on_mouse_down("left", stop).on_click(action).child(label);
    return h_flex().id("bar").size_full().min_w(0).gap(8).items_center().bg(C.ground)
      .on_size_change((size) => { this.barW = size.width; })
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel((e) => { if (view === "terminals" && Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      .child(control)
      .child(div().id("bar-sep").w(4).h(22).flex_none().rounded(2).bg(C.gray)) // views | tabs
      .child(middle)
      .child(panelButton("files", "files.svg"))
      .child(panelButton("changes", "changes.svg"))
      .child(pill("term").px(12).text_size(13).bg(shared("lcars.term.open") === true ? C.orange : C.gray).hover((s) => s.bg(shared("lcars.term.open") === true ? C.orange : C.violet))
        .on_mouse_down("left", stop).on_click((_e, cx) => this.toggleTerm(cx)).child("TERM"))
      .when(w?.buttons, (el) => el.child(button("minimize", win ? svg(`${DIR}/win-min.svg`).size(16).text_color(C.ink) : "−", () => run("window.minimize")))
        .child(button("maximize", win ? svg(`${DIR}/${w.maximized ? "win-restore" : "win-max"}.svg`).size(16).text_color(C.ink) : "□", () => run("window.maximize")))
        .child(button("close-window", win ? svg(`${DIR}/win-close.svg`).size(16).text_color(C.ink) : svg(`${DIR}/close.svg`).size(13).text_color(C.ink), () => run("window.close"))));
  }
}
