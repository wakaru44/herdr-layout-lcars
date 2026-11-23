// lcars-frame: the LCARS frame of the lcars-bridge layout (cloned from the community lcars mod by jkuepker,
// stripped of its Shepherdr integration and tab pills; the tab bar is lcars-bar's job here).
// One mod draws every part; the layout says which with props().part:
// "top" (upper elbow, arm and title), "side" (spaces and crew as LCARS buttons), "bottom" (lower elbow and
// status arm). As a popup it is "machines" (where a new space goes).
// Right-clicks open Herdr's own menu mod, so rename, close, split and worktrees work as in its other layouts.
import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { spaces, agents, panes, machines, run, props, setAgentOrder, window, openOverlay, closeOverlay, settings, shared, setShared } from "herdr";

// Two palettes: dark is the classic LCARS on black; light puts the same slabs on Solarized-light paper.
// C = flat fills (black ink on top), T = the same hues darkened to read as text on the ground, I = status text.
const DARK = {
  C: { ground: "#000000", ink: "#000000", orange: "#ff9900", peach: "#ff9966", gold: "#ffcc66", tan: "#ffcc99", lilac: "#cc99cc",
    violet: "#9999ff", blue: "#99ccff", sky: "#5599ff", red: "#ff5544", gray: "#666688" },
};
DARK.T = { orange: DARK.C.orange, gold: DARK.C.gold, tan: DARK.C.tan, lilac: DARK.C.lilac, violet: DARK.C.violet,
  blue: DARK.C.blue, red: DARK.C.red, gray: DARK.C.gray };
const LIGHT = {
  C: { ground: "#fdf6e3", ink: "#000000", orange: "#ff9900", peach: "#f4906a", gold: "#f0be3c", tan: "#e6b98a", lilac: "#c08fc0",
    violet: "#9494f5", blue: "#7db9ee", sky: "#5a97f0", red: "#f2594a", gray: "#8c8ca8" },
  T: { orange: "#a85200", gold: "#7d5c00", tan: "#586e75", lilac: "#8a4a8a", violet: "#4f4fc8", blue: "#1d62a3", red: "#b8231a", gray: "#5f7479" },
};
let C = DARK.C, T = DARK.T, SPACE_COLORS, STATUS, STATUS_T;
// re-read on every render: a light/dark switch re-renders the mod, and the next render picks the other palette
function pal() {
  ({ C, T } = settings()?.dark === false ? LIGHT : DARK);
  SPACE_COLORS = [C.tan, C.lilac, C.peach, C.blue, C.violet];
  STATUS = { working: C.blue, blocked: C.red, done: C.gold, idle: C.violet };
  STATUS_T = { working: T.blue, blocked: T.red, done: T.gold, idle: T.violet };
}
pal();
const WORD = { working: "WORKING", blocked: "NEEDS YOU", done: "DONE", idle: "STANDING BY" };
const CREAM = "#fdf6e3"; // Solarized base3: the hover ink on the bottom elbow
const SIDE = 210; // the sidebar's width, which the elbows match
const ARM = 20; // the thickness of the horizontal arms
const GAP = 4; // black between LCARS blocks

// Alerts (red alert on blocked, hail on done). A count that rises starts one gentle pulse that stops after PULSE_MS and
// leaves a static state; a count back at 0 resets. Pure so it can be tested: step(state, n) -> { n, pulse, start }.
const PULSE_MS = 5000;
const ALERT = "#d9483a"; // dim red for the frame: 4.9:1 under the black ink on the elbow, still clearly not the status red
const step = (s, n) => ({ n, pulse: n === 0 ? false : n > s.n ? true : s.pulse, start: n > s.n });
// the done agent that has waited longest: earliest tab changed_at; agents without one go last, ties keep list order
const oldestDone = (done, changed) => done.reduce((best, a) => !best || (changed(a) ?? Infinity) < (changed(best) ?? Infinity) ? a : best, null);

const up = (s) => String(s ?? "").toUpperCase();
const two = (n) => String(n).padStart(2, "0");

function stardate(now) {
  // a made-up but steady stardate: year, then the day's fraction of the year
  const d = new Date(now);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return `${d.getUTCFullYear() - 1920}${(((now - start) / 864e5) * 2.7397).toFixed(1).padStart(6, "0")}`;
}

// a block of LCARS colour with a black label set in its bottom-right corner
function slab(id, color, label, h, extra) {
  let el = div().id(id).w_full().h(h).flex_none().bg(color).flex().items_end().justify_end().px(10).pb(2)
    .text_color(C.ink).text_size(15).font_weight(700).child(up(label));
  return extra ? extra(el) : el;
}

// Herdr's menu mod at the pointer: tab is "space", "tab", "pane" or "global"
const menu = (tab, target) => openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab, target } });
// a right-click handler that opens one menu; stopping the press keeps the bar behind from opening its own
const onRight = (open) => (_e, cx) => { cx.stop_propagation(); open(); };
const globalMenu = () => menu("global", {});
// where a new space goes, when there is more than this computer
function newSpace() {
  const away = machines().filter((m) => m.name);
  if (!away.length) return run("space.new", {});
  openOverlay({ mod: "lcars-frame", kind: "popup", width: 230, height: 60 + 44 * (away.length + 1),
    frame: "none", props: { part: "machines" } });
}

// The harness icon, tinted by the caller. Herdr's own table icons are used when they are one-colour glyphs (`tint`, or
// claude's single path). Some ship as a colour tile or gradient that a tint flattens into a solid square (codex), so those
// have a glyph-only copy in mods/lcars-frame/icons/. Anything else returns null and the row keeps the program's name.
const OWN_GLYPHS = new Set(["codex", "antigravity", "kiro"]);
function harnessIcon(a) {
  const icon = a.program?.icon;
  if (!icon) return null;
  const key = icon.split("/").pop().replace(/\.svg$/, "");
  if (OWN_GLYPHS.has(key)) return `mods/lcars-frame/icons/${key}.svg`;
  return a.program.tint || key === "claude" ? icon : null;
}

// Crew sort. Natural is Herdr's order; the A-Z and project buttons each cycle off -> ascending -> descending -> off.
// Kept in shared "lcars.crew.sort" ("natural", "alpha", "alpha-desc", "project", "project-desc") so it survives
// restarts. Ascending floats the foremen (their tabs start with a star) to the top; descending sinks them.
const BUTTONS = [["alpha", "sort-alpha"], ["project", "sort-project"], ["natural", "sort-natural"]];
const MODES = new Set(["natural", "alpha", "alpha-desc", "project", "project-desc"]);
const byText = (a, b) => String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
function sortCrew(crew, mode) {
  const dir = mode.endsWith("-desc") ? -1 : 1, kind = mode.replace("-desc", "");
  if (kind === "alpha") return [...crew].sort((a, b) => dir * byText(a.tab_name, b.tab_name));
  if (kind === "project") return [...crew].sort((a, b) => dir * (byText(a.space_name, b.space_name) || byText(a.tab_name, b.tab_name)));
  return crew;
}
// what a click on a button does from the current mode
const nextMode = (id, mode) => id === "natural" ? "natural" : mode === id ? `${id}-desc` : mode === `${id}-desc` ? "natural" : id;

// Crew filter: the text splits on spaces; a row matches when every word is a case-insensitive substring of its whole
// searchable string, in any order. Empty text matches everything. Kept in shared "lcars.crew.filter" (text) and
// "lcars.crew.filter.open" (box shown), so clicking around, re-renders and mod reloads keep it.
const crewMatches = (text, row) => {
  const hay = String(row ?? "").toLowerCase();
  return String(text ?? "").toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};
const crewRow = (a) => [a.tab_name, a.title, a.space_name, a.program?.name, a.app, WORD[a.status], a.status, a.address].filter(Boolean).join(" "); // address = terminal id (t3p), so `t3p` finds it
const FILTER_KEY = "lcars.crew.filter", OPEN_KEY = "lcars.crew.filter.open";

export default class LcarsFrame extends View {
  init(_props, cx) {
    this.now = Date.now();
    if (props()?.part === "side") {
      this.filterInput = InputState.new({ value: String(shared(FILTER_KEY) ?? ""), placeholder: "filter crew..." });
      this.filterInput.on("change", () => setShared(FILTER_KEY, this.filterInput.value()));
      this.filterHandle = cx.focus_handle();
    }
    cx.timer.every(15000, (cx) => { this.now = Date.now(); cx.notify(); });
    // each part is its own instance; the alert state is only needed by top (blocked) and bottom (done)
    this.alerts = { blocked: { n: 0, pulse: false, tok: 0 }, done: { n: 0, pulse: false, tok: 0 } };
    cx.timer.every(1000, (cx) => {
      let changed = false;
      for (const [status, s] of Object.entries(this.alerts)) {
        const next = step(s, agents().filter((a) => a.status === status).length);
        if (next.n !== s.n || next.pulse !== s.pulse) changed = true;
        s.n = next.n; s.pulse = next.pulse;
        if (next.start) {
          const tok = ++s.tok;
          cx.timer.after(PULSE_MS, (cx) => { if (s.tok === tok) { s.pulse = false; cx.notify(); } });
        }
      }
      if (changed) cx.notify();
    });
  }

  render() {
    pal();
    const part = props()?.part;
    if (part === "top") return this.top();
    if (part === "side") return this.side();
    if (part === "bottom") return this.bottom();
    if (part === "machines") return this.machines();
    return div().child(`lcars-frame: unknown part ${part}`);
  }

  machines() {
    const close = () => closeOverlay(props()?.overlay);
    const all = [{ name: null, layout: "ready" }, ...machines().filter((m) => m.name)];
    const row = (m, i) => {
      const ready = m.layout === "ready";
      return slab(`new-space-${m.name ?? "local"}`, ready ? SPACE_COLORS[i % SPACE_COLORS.length] : C.gray,
        `${m.name ?? "this computer"}${ready ? "" : " · " + m.layout}`, 40, (el) => el
          .when(ready, (el) => el.cursor_pointer().hover((st) => st.opacity(0.85))
            .on_click(() => { close(); run("space.new", m.name ? { machine: m.name } : {}); })));
    };
    return v_flex().size_full().bg(C.ground).rounded(14).p(6).gap(GAP)
      .child(slab("new-space-title", C.orange, "new space on", 30, (el) => el.rounded_tl(12).rounded_tr(12)))
      .children(all.map(row));
  }

  top() {
    const space = spaces().find((s) => s.active);
    // the wordmark sits in the elbow's upper right; the shown space's machine at the bottom right
    const red = agents().filter((a) => a.status === "blocked").length, hot = this.alerts.blocked.pulse;
    const frame = red ? ALERT : C.orange; // the frame shifts toward red while anyone needs you
    const elbow = div().w(SIDE).h_full().flex_none().bg(frame).rounded_tl(44)
      .flex().flex_col().items_end().justify_between().px(10).pt(6).pb(4).text_color(C.ink)
      .child(div().text_size(26).child("BRIDGE"))
      .child(div().text_size(13).font_weight(700).child(up(space?.machine ?? "this computer")));
    const arm = h_flex().w_full().h(ARM).flex_none().gap(GAP)
      .child(div().id("top-arm-lead").w(160).h_full().bg(frame)
        .when(red > 0 && hot, (el) => el.loop("opacity", { from: 0.7, to: 1, period: 800 }))) // strip only, never text
      .child(div().w(70).h_full().bg(C.lilac))
      .child(div().flex_1().h_full().bg(C.tan))
      .child(div().w(46).h_full().bg(C.blue).rounded_tr(10).rounded_br(10));
    // the concave inner corner: black with a rounded top-left corner, over the elbow's orange
    const title = div().w_full().flex_1().bg(frame).child(
      h_flex().size_full().bg(C.ground).rounded_tl(26).items_center().justify_end().gap(14).pr(4)
        .when(red > 0, (el) => el.child(div().text_color(T.red).text_size(15).font_weight(700).child(`RED ALERT: ${red} NEED YOU`)))
        .child(div().text_color(T.gold).text_size(13).font_weight(700).child(`STARDATE ${stardate(this.now)}`))
        .child(div().text_color(T.orange).text_size(30).font_weight(700).child(up(space?.name ?? "HERDR"))));
    return h_flex().id("top").size_full().bg(C.ground).on_mouse_down("right", onRight(globalMenu))
      .child(elbow)
      .child(v_flex().flex_1().h_full().child(arm).child(title));
  }

  // CREW slab: three sort buttons on the left (the lit one is inverted; an up arrow means descending), the count on the right
  crewLabel(count, total, mode) {
    const stop = (_e, cx) => cx.stop_propagation();
    const open = shared(OPEN_KEY) === true, active = open || String(shared(FILTER_KEY) ?? "").trim() !== "";
    const filterButton = div().id("crew-filter").w(24).h(20).flex_none().flex().items_center().justify_center().rounded(10)
      .bg(active ? C.orange : C.lilac).text_color(C.ink).cursor_pointer()
      .hover((st) => st.opacity(0.7)).on_mouse_down("left", stop)
      .on_click(() => { setShared(OPEN_KEY, !open); if (!open) this.filterInput?.focus(); })
      .child(svg("mods/lcars-frame/icons/filter.svg").size(15));
    const button = ([id, icon]) => {
      const on = mode === id || mode === `${id}-desc`, desc = mode === `${id}-desc`;
      return div().id(`crew-sort-${id}`).w(24).h(20).flex_none().flex().items_center().justify_center().rounded(10)
        .bg(on ? C.ink : C.lilac).text_color(on ? C.lilac : C.ink).cursor_pointer()
        .hover((st) => st.opacity(0.7)).on_mouse_down("left", stop).on_click(() => setShared("lcars.crew.sort", nextMode(id, mode)))
        .child(svg(`mods/lcars-frame/icons/${icon}${desc ? "-up" : ""}.svg`).size(15));
    };
    return h_flex().id("crew-label").w_full().h(26).flex_none().bg(C.lilac).items_center().justify_between().px(6)
      .text_color(C.ink).text_size(15).font_weight(700)
      .child(h_flex().gap(4).items_center().children(BUTTONS.map(button)).child(filterButton))
      .child(up(count === total ? `crew ${two(total)}` : `crew ${two(count)}/${two(total)}`));
  }

  // the filter text box under the CREW header; x clears the text and keeps the box open, Esc clears, then closes
  filterBox() {
    const clear = () => { this.filterInput.set_value(""); setShared(FILTER_KEY, ""); this.filterInput.focus(); };
    return h_flex().id("crew-filter-box").track_focus(this.filterHandle).w_full().h(26).flex_none().bg(C.ground).items_center().gap(4).px(2)
      .on_key_down((e, cx) => {
        if (e.key !== "escape") return;
        cx.stop_propagation();
        if (String(shared(FILTER_KEY) ?? "") !== "") clear(); else setShared(OPEN_KEY, false);
      })
      .child(Input.new(this.filterInput).flex_1().min_w(0).h(22).px(8).rounded(11).border(1)
        .border_color(C.lilac).bg(C.ground).text_size(12).text_color(T.tan))
      .child(div().id("crew-filter-x").w(18).h(18).flex_none().flex().items_center().justify_center().rounded(9)
        .bg(C.lilac).text_color(C.ink).text_size(13).font_weight(700).cursor_pointer().hover((st) => st.opacity(0.7))
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(clear).child("×"));
  }

  side() {
    const list = spaces();
    const mode = MODES.has(shared("lcars.crew.sort")) ? shared("lcars.crew.sort") : "natural";
    const all = sortCrew(agents(), mode);
    const text = String(shared(FILTER_KEY) ?? "");
    const crew = all.filter((a) => crewMatches(text, crewRow(a)));
    setAgentOrder(crew.map((a) => a.address)); // agent.next / agent.prev follow what the list shows
    const space = (s, i) => {
      const color = s.active ? C.orange : s.status === "blocked" ? C.red : SPACE_COLORS[i % SPACE_COLORS.length];
      return h_flex().id(`space-${s.id}`).w_full().h(40).flex_none().bg(color).items_end().justify_between().px(10).pb(2)
        .text_color(s.active ? "#ffffff" : C.ink).font_weight(700).cursor_pointer() // the selected space reads white
        .hover((st) => st.opacity(0.85))
        .when(s.status === "blocked" && !s.active, (el) => el.loop("opacity", { from: 0.55, to: 1, period: 900 }))
        .on_click(() => run("space.select", { id: s.id }))
        .on_mouse_down("right", onRight(() => menu("space", { id: s.id })))
        .child(div().text_size(12).child(`${two(s.index)}${s.machine ? "-" + up(s.machine) : ""}`))
        .child(div().text_size(15).truncate().child(up(s.name)));
    };
    const member = (a) => h_flex().id(`agent-${a.address}`).w_full().h(40).flex_none().gap(6).items_center()
      .cursor_pointer().hover((st) => st.opacity(0.85))
      .on_click(() => run("agent.focus", { terminal: a.address }))
      .on_mouse_down("right", onRight(() => menu("pane", { pane: a.pane, terminal: a.address })))
      .child(div().w(14).h_full().bg(STATUS[a.status] ?? C.gray).rounded_l(15)
        .when(a.status === "blocked", (el) => el.loop("opacity", { from: 0.4, to: 1, period: 700 })))
      .child(v_flex().flex_1().min_w(0)
        // the harness is a recoloured icon (Herdr's own program table: claude, codex, hermes, ...), not its name; the
        // name stays as the fallback for a program without one
        .child(h_flex().gap(6).items_center().min_w(0).text_color(a.focused ? T.orange : T.tan)
          .when(Boolean(harnessIcon(a)), (el) => el.child(svg(harnessIcon(a)).size(15).flex_none()))
          .child(div().text_size(13).font_weight(700).truncate()
            .child(up(harnessIcon(a) ? a.tab_name : `${a.program?.name ?? a.app ?? "agent"} · ${a.tab_name}`))))
        .child(div().text_size(11).text_color(STATUS_T[a.status] ?? T.gray).truncate()
          .child(`${WORD[a.status] ?? up(a.status)} · ${up(a.space_name)}`)));
    return v_flex().id("side").size_full().bg(C.ground).gap(GAP).on_mouse_down("right", onRight(globalMenu))
      .child(div().w_full().h(18).flex_none().bg(C.orange)) // carries the top elbow down
      .child(slab("spaces-label", C.peach, `spaces ${two(list.length)}`, 26))
      .children(list.map(space))
      .child(slab("space-new", C.gray, "+ new space", 30, (el) => el.cursor_pointer()
        .hover((st) => st.bg(C.violet)).on_click(() => newSpace()).on_mouse_down("right", onRight(newSpace))))
      .child(this.crewLabel(crew.length, all.length, mode))
      .when(shared(OPEN_KEY) === true, (el) => el.child(this.filterBox()))
      // the crew list takes the rest of the column and scrolls; its own background is the grey that runs into the
      // bottom elbow, showing below the rows when there are few of them
      .child(v_flex().id("crew").w_full().flex_1().min_h(10).bg(C.gray).overflow_y_scrollbar()
        .child(v_flex().w_full().flex_none().bg(C.ground).gap(2).pr(4).children(crew.map(member))
          .when(crew.length === 0 && all.length > 0, (el) => el.child(div().px(10).py(8).text_size(12).font_weight(700).text_color(T.gray).child("NO MATCHES")))));
  }

  bottom() {
    const crew = agents();
    const count = (s) => crew.filter((a) => a.status === s).length;
    const done = crew.filter((a) => a.status === "done");
    const tabAt = new Map(spaces().flatMap((s) => s.tabs.map((x) => [x.id, x.changed_at])));
    const paneTab = new Map(panes().map((p) => [p.pane, p.tab]));
    const oldest = oldestDone(done, (a) => tabAt.get(a.tab ?? paneTab.get(a.pane)));
    const away = machines().filter((m) => m.name).length;
    const clock = new Date(this.now).toTimeString().slice(0, 5);
    const elbow = div().id("menu").w(SIDE).h_full().flex_none().bg(C.gray).rounded_bl(40)
      .flex().items_start().justify_end().px(10).pt(4).text_color(C.ink).text_size(13).font_weight(700)
      .cursor_pointer().hover((st) => st.bg(C.violet)).on_click(() => menu("global", {}))
      .child(h_flex().gap(22).items_center()
        // each control turns cream (Solarized base3) under the pointer so it is clear which one you are on;
        // the gear and sun/moon stop their presses so the elbow's own MENU click does not also fire
        .child(div().id("settings").cursor_pointer().hover((st) => st.text_color(CREAM))
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_mouse_down("right", (_e, cx) => cx.stop_propagation())
          .on_click(() => run("app.settings"))
          .child(svg("mods/lcars-frame/gear.svg").size(16)))
        // light/dark: shows the mode you would switch to (sun while dark, moon while light); lcars-bar does the flip
        .child(div().id("appearance").cursor_pointer().text_size(16).font_weight(700).hover((st) => st.text_color(CREAM))
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_mouse_down("right", (_e, cx) => cx.stop_propagation())
          .on_click(() => run("lcars-bar.appearance"))
          .child(settings()?.dark === false ? "☾" : "☀"))
        .child(div().id("menu-label").hover((st) => st.text_color(CREAM)).child("MENU")));
    const status = div().w_full().flex_1().bg(C.gray).child(
      h_flex().size_full().bg(C.ground).rounded_bl(22).items_center().gap(18).pl(18).text_size(12).font_weight(700)
        .child(div().text_color(T.blue).child(`${two(count("working"))} WORKING`))
        .child(div().text_color(count("blocked") ? T.red : T.gray).child(`${two(count("blocked"))} NEED YOU`))
        .child(div().text_color(T.gold).child(`${two(count("done"))} DONE`))
        .when(done.length > 0 && oldest, (el) => el.child(div().id("hail").h(18).px(8).flex().items_center().rounded(9).bg(C.gold)
          .text_color(C.ink).cursor_pointer().hover((st) => st.opacity(0.85)).tooltip("oldest finished agent")
          .when(this.alerts.done.pulse, (el) => el.loop("opacity", { from: 0.7, to: 1, period: 800 }))
          .on_click(() => run("agent.focus", { terminal: oldest.address })).child(`HAIL ${two(done.length)}`)))
        .child(div().text_color(T.lilac).child(`${two(away + 1)} MACHINES`))
        .child(div().flex_1())
        .child(div().id("palette").text_color(T.tan).cursor_pointer().on_click(() => run("app.palette"))
          .child(`${window()?.platform === "macos" ? "⌘" : "CTRL"} SHIFT P · ${clock}`)));
    const arm = h_flex().w_full().h(16).flex_none().gap(GAP)
      .child(div().w(120).h_full().bg(C.gray))
      .child(div().flex_1().h_full().bg(C.sky))
      .child(div().w(90).h_full().bg(C.peach))
      .child(div().w(46).h_full().bg(C.orange).rounded_tr(8).rounded_br(8));
    return h_flex().id("bottom").size_full().bg(C.ground).on_mouse_down("right", onRight(globalMenu))
      .child(elbow)
      .child(v_flex().flex_1().h_full().child(status).child(arm));
  }
}
