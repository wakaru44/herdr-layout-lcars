// lcars-board: every agent as a card in status columns. Click a card to open its pane.
// Colours come from theme() only. Elapsed time is the agent's tab changed_at (the only
// timestamp herdr exposes); omitted when null.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { agents, panes, spaces, run, theme, setShared, openOverlay, closeOverlay, props, hc, terminals, notify, shared, focused as focusedNow, settings } from "herdr";

const COLUMNS = ["blocked", "working", "done", "idle"];
const MONO = "JetBrains Mono";
const MENU = [
  ["rename", null],
  ["split right", "pane.split", { direction: "right" }],
  ["split down", "pane.split", { direction: "down" }],
  ["close", "pane.close", {}],
];

const age = (ms) => {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  return m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
};

// LCARS palettes: dark is the classic look on black; light puts the same slabs on Solarized-light paper
// (fills keep black ink; TT/TO are the tan/orange darkened to read as text on the paper).
const DARK = { ground: "#000000", ink: "#000000", orange: "#ff9900", tan: "#ffcc99", gray: "#666688", lilac: "#cc99cc", tt: "#ffcc99", to: "#ff9900",
  status: { working: "#99ccff", blocked: "#ff5544", done: "#ffcc66", idle: "#9999ff", unknown: "#666688" } };
const LIGHTP = { ground: "#fdf6e3", ink: "#000000", orange: "#ff9900", tan: "#e6b98a", gray: "#8c8ca8", lilac: "#c08fc0", tt: "#586e75", to: "#a85200",
  status: { working: "#7db9ee", blocked: "#f2594a", done: "#f0be3c", idle: "#9494f5", unknown: "#8c8ca8" } };
let LCARS, GROUND, INK, ORANGE, TAN, GRAY, LILAC, TT, TO;
function pal() {
  const P = settings()?.dark === false ? LIGHTP : DARK;
  ({ ground: GROUND, ink: INK, orange: ORANGE, tan: TAN, gray: GRAY, lilac: LILAC, tt: TT, to: TO } = P);
  LCARS = P.status;
}
pal();
// Idle: nobody working and nobody blocked. Pure so it can be tested.
const standingBy = (list) => list.length > 0 && !list.some((a) => a.status === "working" || a.status === "blocked");

const ink = (_t, s) => LCARS[s] ?? GRAY;

// --- C4 target reticle + D7 transporter shimmer: pure helpers (unit-tested in node) ---
const ARM = 10, THICK = 2, GAP = 3, BREATH_MS = 1200, BREATH_PX = 5, ALERT_MS = 5000;
const SHIM_TICKS = 8, SHIM_MS = 100, SHIM_COLS = 4, SHIM_ROWS = 3, SHIM_EVERY = 3000;
// panes in `now` that were not in `seen`; nothing on the first look so a reload does not shimmer everything
const newPanes = (seen, now) => (seen ? now.filter((p) => !seen.has(p)) : []);
const allowShimmer = (last, now) => now - last >= SHIM_EVERY;
// one frame of tile opacities: random, fading out so the last frame is empty (it "settles")
const shimmerFrame = (tick, rand = Math.random) =>
  Array.from({ length: SHIM_COLS * SHIM_ROWS }, () => (tick >= SHIM_TICKS ? 0 : +(rand() * 0.85 * (1 - tick / SHIM_TICKS)).toFixed(2)));
// outward travel of the brackets: 0..BREATH_PX..0 every BREATH_MS, static (0) once ALERT_MS has passed
const breathOffset = (elapsed) => elapsed >= ALERT_MS || elapsed < 0 ? 0 : Math.round(BREATH_PX * (0.5 - 0.5 * Math.cos((2 * Math.PI * elapsed) / BREATH_MS)));
// distance of a corner square's outer edge from the wrapper edge (wrapper pad PAD around the card): outside the border by GAP + off
const PAD = 10;
const cornerInset = (off = 0) => PAD - (GAP + off + THICK);

// Card names. A human name is a core label on the terminal (kept by herdr-core, shared by every Herdr screen):
//   hc label t11 lcars.name="fix login"      (empty value removes it)
// It wins over whatever the agent reports. If there is none, the agent's own title is used unless it is generic.
const NAME_KEY = "lcars.name";
const manualName = (rec) => {
  const l = rec?.labels;
  const v = Array.isArray(l)
    ? String(l.find((s) => String(s).startsWith(NAME_KEY + "=")) ?? "").slice(NAME_KEY.length + 1)
    : l?.[NAME_KEY];
  return String(v ?? "").trim();
};
// Titles that tell you nothing: most sessions open with these, or with the terminal's own id. Edit freely.
const GENERIC = /^(recall project context|project context recall|claude( code)?|codex|shell|terminal|t[0-9a-z]{1,3})$/i;
function autoTitle(a, tab) {
  const t = String(a.title ?? "").trim();
  if (t && !GENERIC.test(t)) return t;
  const tn = String(tab?.name ?? "").trim(); // a tab someone named is a better hint than nothing
  if (tn && !/^\d+$|^tb\d+$/.test(tn)) return tn;
  return "";
}
function renameCard(terminal, value) {
  openOverlay({ mod: "lcars-board", kind: "dialog", width: 400, height: 214, props: { rename: true, terminal, value } });
}

// Terminals view: focus the pane, then flip the work column's view stack.
function open(pane) {
  run("pane.focus", { pane });
  setShared("lcars.view", "terminals");
  run("layout.select", { stack: "view", child: "terminals" });
}

export default class Board extends View {
  init(_props, cx) {
    // Focus handles can't be made during render: a fixed pool, handed out per card in render order.
    this.pool = Array.from({ length: 64 }, () => cx.focus_handle());
    this.used = 0;
    this.cx = cx;
    this.seen = null;      // panes seen by the last render (null until the first one, so a reload does not shimmer)
    this.lastShim = -Infinity;
    this.shim = new Map(); // pane -> tick of its running shimmer
    this.breath = new Map(); // pane -> start time of its bracket breathing
    if (props()?.rename) this.initRename(cx);
  }

  // The rename dialog is this same mod opened as a dialog (props.rename). Enter saves, Esc cancels.
  initRename(cx) {
    this.text = props().value ?? "";
    this.input = InputState.new({ value: this.text });
    if (this.text) this.input.set_selected_range({ start: 0, end: this.text.length });
    this.input.on("change", () => { this.text = this.input.value(); cx.notify(); });
    this.input.on("submit", () => this.save(false));
    this.inputFocused = true;
    this.input.on("focus", (_e, cx) => { this.inputFocused = true; cx.notify(); });
    this.input.on("blur", (_e, cx) => { this.inputFocused = false; cx.notify(); });
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.handle = cx.focus_handle();
  }

  // clear = true removes the name, so the card goes back to the agent's own title
  save(clear) {
    const p = props();
    const name = clear ? "" : this.text.replace(/\s+/g, " ").trim();
    closeOverlay(p.overlay);
    hc(["label", p.terminal, `${NAME_KEY}=${name}`]).then((r) => {
      if (r && r.code) notify({ title: "Could not rename card", body: String(r.stderr || r.stdout || "").trim(), level: "error" });
    }).catch((e) => notify({ title: "Could not rename card", body: String(e), level: "error" }));
  }

  renameDialog() {
    const p = props();
    const pill = (id, label, color, action) => div().id(id).h(30).px(16).flex_none().flex().items_center().rounded(15)
      .bg(color).text_color(INK).text_size(14).font_weight(700).cursor_pointer().hover((s) => s.opacity(0.85))
      .on_click(action).child(label);
    return v_flex().id("rename").track_focus(this.handle)
      .on_key_down((e, cx) => { if (e.key === "escape") { closeOverlay(p.overlay); cx.stop_propagation(); } })
      .size_full().bg(GROUND).p(14).gap(10)
      .child(h_flex().h(32).flex_none().items_end().justify_end().px(12).pb(2).bg(ORANGE).rounded_tl(16).text_color(INK)
        .text_size(17).font_weight(700).child("NAME THIS CARD"))
      .child(div().text_size(12).font_weight(700).text_color(TT).child(`WHAT IS THIS AGENT FOR? · ${String(p.terminal).toUpperCase()}`))
      .child(Input.new(this.input).h(38).px(12).rounded(10).border(2)
        .border_color(this.inputFocused ? ORANGE : GRAY).bg(GROUND).text_size(15).text_color(TT))
      .child(h_flex().pt(4).gap(8).justify_end()
        .when(Boolean(p.value), (el) => el.child(pill("rn-clear", "USE AUTO TITLE", GRAY, () => this.save(true))))
        .child(pill("rn-cancel", "CANCEL", LILAC, () => closeOverlay(p.overlay)))
        .child(pill("rn-save", "SAVE", ORANGE, () => this.save(false))));
  }

  // Popup of this same mod, opened by a card's more-horizontal button.
  menu(t) {
    const { pane, terminal, value } = props();
    return v_flex().w_full().p(4).bg(t.popover).text_size(12).text_color(t.foreground)
      .children(MENU.map(([label, cmd, extra]) => div()
        .id(`m-${label}`).h(28).px(8).rounded(6).flex().items_center().cursor_pointer()
        .hover((el) => el.bg(t.hover))
        .on_click(() => {
          closeOverlay(props().overlay);
          if (!cmd) renameCard(terminal, value);
          else run(cmd, { pane, ...extra });
        })
        .child(label)));
  }

  card(t, a, tab, machine) {
    const live = a.status === "working" || a.status === "blocked";
    const since = tab?.changed_at ? age(Date.now() - tab.changed_at) : null;
    // always tan: idle/done cards used to be grey, which is only 3.8:1 on black. The status strip and column carry the state.
    const shown = a.manual || autoTitle(a, tab);
    const titleInk = TT;
    const handle = this.pool[this.used++];
    // lit (orange) when this card has the keyboard or is the agent shown in the quick terminal below the board
    const focused = (handle?.is_focused() ?? false) || focusedNow()?.agent === a.terminal;
    const mono = (el) => el.font_family(MONO).text_size(11).text_color(t.dim);
    const seal = div().flex_none().px(8).h(18).rounded(9).bg(TAN)
      .flex().items_center().text_size(11).font_weight(700).text_color(INK).child((machine ?? "this computer").toUpperCase());
    // an LCARS crew row: a rounded status strip on the left, black body, thin frame (orange when focused)
    const body = h_flex()
      .id(`card-${a.pane}`)
      .when(Boolean(handle), (el) => el.track_focus(handle))
      .on_key_down((e) => { if (e.key === "enter") open(a.pane); })
      // click: show this agent in the quick terminal under the board; double-click (or Enter): open its tab full size
      .on_click(() => {
        // click: show this agent in the quick terminal under the board (folding it is the strip's job: lcars-termhead)
        setShared("lcars.board.termShown", true);
        run("layout.show", { id: "board-term" });
        run("agent.focus", { terminal: a.terminal });
      })
      .on_mouse_down("left", (e) => { if (e.click_count === 2) open(a.pane); })
      .w_full().flex_none().gap(10).items_stretch()
      .bg(GROUND).rounded(10).border(2).border_color(focused ? ORANGE : GRAY)
      .overflow_hidden()
      .cursor_pointer()
      .hover((el) => el.bg(t.raised))
      .child(div().w(14).flex_none().bg(ink(t, a.status))
        .when(a.status === "blocked", (el) => el.loop("opacity", { from: 0.4, to: 1, period: 700 })))
      .child(v_flex().flex_1().min_w(0).gap(6).py(10)
        // up to two lines, then cut; an unnamed card says so and the pencil is lit to invite a name
        .child(div().min_w(0).max_h(40).overflow_hidden().text_size(14).font_weight(700).text_color(titleInk)
          .when(!shown, (el) => el.opacity(0.6))
          .child(shown ? String(shown).toUpperCase() : "UNNAMED"))
        .child(h_flex().gap(8).items_center().flex_wrap()
          .child(seal)
          .child(mono(div().truncate().child(a.space_name)))
          .child(mono(div().child(a.terminal)))
          .when(Boolean(since), (el) => el.child(mono(div().child(since))))))
      .child(div().id(`rename-${a.pane}`).flex_none().p(8).text_color(shown ? t.dim : TO)
        .hover((el) => el.text_color(TO))
        .tooltip("name this card")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => { cx.stop_propagation(); renameCard(a.terminal, a.manual); })
        .child(svg("mods/lcars-board/pencil.svg").size(15)))
      .child(div().id(`more-${a.pane}`).flex_none().p(8).text_color(t.dim)
        .hover((el) => el.text_color(TO))
        .tooltip("rename, split or close")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => {
          cx.stop_propagation();
          openOverlay({ mod: "lcars-board", kind: "popup", width: 160, height: 140,
            props: { menu: true, pane: a.pane, terminal: a.terminal, value: a.manual } });
        })
        .child(svg("mods/lcars-board/more-horizontal.svg").size(16)));
    // wrapper: PAD of room around the card for the reticle (C4) and the shimmer tiles (D7), which must not cover the text
    const col = ink(t, a.status);
    const off = this.breathing(a, focused);
    const inset = cornerInset(off);
    const corner = (v, h) => {
      const side = (el) => (h === "left" ? el.left(0) : el.right(0));
      const rect = (w, ht) => side((v === "top" ? div().absolute().w(w).h(ht).bg(col).top(0) : div().absolute().w(w).h(ht).bg(col).bottom(0)));
      const e = div().absolute().w(ARM).h(ARM);
      const pos = (v === "top" ? e.top(inset) : e.bottom(inset));
      return (h === "left" ? pos.left(inset) : pos.right(inset)).child(rect(ARM, THICK)).child(rect(THICK, ARM));
    };
    const tick = this.shim.get(a.pane);
    return v_flex().id(`wrap-${a.pane}`).relative().w_full().flex_none().p(PAD).my(-PAD / 2)
      .child(body)
      .when(focused, (el) => el.children([corner("top", "left"), corner("top", "right"), corner("bottom", "left"), corner("bottom", "right")]))
      .when(tick !== undefined, (el) => el.child(v_flex().absolute().left(PAD).top(PAD).right(PAD).bottom(PAD).gap(2)
        .children(Array.from({ length: SHIM_ROWS }, (_r, r) => h_flex().flex_1().gap(2)
          .children(shimmerFrame(tick).slice(r * SHIM_COLS, (r + 1) * SHIM_COLS).map((o) => div().flex_1().bg(col).opacity(o)))))));
  }

  // bracket outward travel for a focused blocked card: starts when it first qualifies, steps every 150 ms for 5 s, then static
  breathing(a, focused) {
    if (!(focused && a.status === "blocked")) { this.breath.delete(a.pane); return 0; }
    const t0 = this.breath.get(a.pane) ?? Date.now();
    if (!this.breath.has(a.pane)) {
      this.breath.set(a.pane, t0);
      const step = (cx) => { cx.notify(); if (Date.now() - t0 < ALERT_MS) cx.timer.after(150, step); };
      this.cx.timer.after(150, step);
    }
    return breathOffset(Date.now() - t0);
  }

  // new agent: run SHIM_TICKS ticks of SHIM_MS, then drop the shimmer; at most one every SHIM_EVERY
  watchNew(all, shownPanes) {
    const fresh = newPanes(this.seen, all).filter((p) => shownPanes.has(p));
    this.seen = new Set(all);
    if (!fresh.length || !allowShimmer(this.lastShim, Date.now())) return;
    this.lastShim = Date.now();
    const pane = fresh[0];
    this.shim.set(pane, 0);
    const step = (cx) => {
      const n = (this.shim.get(pane) ?? 0) + 1;
      if (n >= SHIM_TICKS) this.shim.delete(pane); else this.shim.set(pane, n);
      cx.notify();
      if (n < SHIM_TICKS) cx.timer.after(SHIM_MS, step);
    };
    this.cx.timer.after(SHIM_MS, step);
  }

  column(t, name, cards) {
    // the column header is a flat LCARS slab in the status colour, label bottom-right as on the sidebar slabs
    const empty = cards.length === 0;
    return v_flex().id(`col-${name}`).flex_1().min_w(160).min_h(0).h_full().gap(8)
      .child(h_flex().h(36).flex_none().items_end().justify_between().px(10).pb(2).rounded_tl(18)
        .bg(empty ? GRAY : ink(t, name)).text_color(INK).font_weight(700)
        .child(div().text_size(18).child(String(cards.length).padStart(2, "0")))
        .child(div().text_size(18).child(name.toUpperCase())))
      .child(v_flex().id(`body-${name}`).flex_1().min_h(0).gap(8).overflow_y_scrollbar()
        .children(cards));
  }

  render() {
    pal();
    const t = theme();
    if (props()?.menu) return this.menu(t);
    if (props()?.rename) return this.renameDialog();
    const ag = new Map(agents().map((a) => [a.pane, a]));
    const rec = new Map(terminals().map((x) => [x.address, x]));
    const list = panes().filter((p) => p.terminal).map((p) => {
      const a = ag.get(p.pane);
      return { pane: p.pane, terminal: p.terminal, tab: p.tab, title: a?.title || p.title, program: p.program,
        status: a?.status ?? p.status ?? "idle", manual: manualName(rec.get(p.terminal)) };
    });
    // The board follows the space selected in the sidebar. "ALL SPACES" (shared lcars.board.scope, set from lcars-bar) shows every card.
    const all = shared("lcars.board.scope") === "all";
    const mine = new Set((spaces().find((s) => s.active)?.tabs ?? []).map((x) => x.id));
    const visible = all ? list : list.filter((a) => mine.has(a.tab));
    this.watchNew(list.map((x) => x.pane), new Set(visible.map((x) => x.pane)));
    if (!visible.length) {
      const hidden = list.length > 0; // there are agents, just not in this space
      return v_flex().size_full().bg(t.canvas).items_center().justify_center().gap(8)
        .child(div().text_size(20).font_weight(700).text_color(TO).child(hidden ? "NO AGENTS IN THIS SPACE" : "NO AGENTS YET"))
        .child(div().text_size(13).font_weight(700).text_color(TT).child("START ONE FROM A TERMINAL TAB"))
        .when(hidden, (el) => el.child(div().id("show-all").mt(6).h(30).px(16).flex().items_center().rounded(15).bg(ORANGE)
          .text_color(INK).text_size(14).font_weight(700).cursor_pointer().hover((s) => s.opacity(0.85))
          .on_click(() => setShared("lcars.board.scope", "all")).child(`SHOW ALL SPACES · ${String(list.length).padStart(2, "0")} CARDS`)));
    }
    this.used = 0;
    const owner = new Map(spaces().flatMap((s) => s.tabs.map((x) => [x.id, { s, x }])));
    const known = (a) => COLUMNS.includes(a.status);
    const names = visible.some((a) => !known(a)) ? [...COLUMNS, "unknown"] : COLUMNS;
    const cols = names.map((n) => this.column(t, n, visible.filter((a) => (known(a) ? a.status : "unknown") === n).map((a) => {
      const o = owner.get(a.tab);
      return this.card(t, { ...a, space_name: o?.s.name ?? "" }, o?.x, o?.s.machine);
    })));
    // calm banner above the columns (never an overlay, so every card stays reachable): two thin rounded bars around one line
    const calm = v_flex().id("standing-by").w_full().flex_none().px(16).pt(12).gap(4).items_center()
      .child(div().w_full().h(4).rounded(2).bg(LILAC))
      .child(div().text_size(15).font_weight(700).text_color(TT).child("ALL SYSTEMS STANDING BY"))
      .child(div().w_full().h(4).rounded(2).bg(LILAC));
    return v_flex().id("board").size_full().min_w(0).min_h(0).bg(t.canvas)
      .when(standingBy(visible), (el) => el.child(calm))
      .child(v_flex().id("board-scroll").w_full().flex_1().min_h(0).min_w(0).overflow_x_scroll()
        .child(h_flex().flex_1().min_h(0).w_full().p(16).gap(16).items_stretch().justify_start().children(cols)));
  }
}
