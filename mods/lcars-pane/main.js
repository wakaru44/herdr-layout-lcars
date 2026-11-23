// lcars-pane: [← board] dot title status-word pane-id ........ split split zoom close
// Props from the app: { pane, terminal }. Reads panes(); every command carries the explicit pane.
import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, theme, setShared, settings } from "herdr";

const MONO = "JetBrains Mono";

// dark = classic LCARS on black; light = the same slabs on Solarized-light paper.
// LCARS = status fills (the dot, the rule), STATUS_T = the same hues darkened for status text on paper.
const DARK = { ground: "#000000", ink: "#000000", orange: "#ff9900", tan: "#ffcc99", gray: "#666688", violet: "#9999ff",
  lcars: { working: "#99ccff", blocked: "#ff5544", done: "#ffcc66", idle: "#9999ff" },
  text: { working: "#99ccff", blocked: "#ff5544", done: "#ffcc66", idle: "#9999ff" }, tt: "#ffcc99", tg: "#666688" };
const LIGHTP = { ground: "#fdf6e3", ink: "#000000", orange: "#ff9900", tan: "#e6b98a", gray: "#8c8ca8", violet: "#9494f5",
  lcars: { working: "#7db9ee", blocked: "#f2594a", done: "#f0be3c", idle: "#9494f5" },
  text: { working: "#1d62a3", blocked: "#b8231a", done: "#7d5c00", idle: "#4f4fc8" }, tt: "#586e75", tg: "#5f7479" };
let LCARS, STATUS_T, BLACK, INK, ORANGE, GRAY, VIOLET, TT, TG;
function pal() {
  const P = settings()?.dark === false ? LIGHTP : DARK;
  ({ ground: BLACK, ink: INK, orange: ORANGE, gray: GRAY, violet: VIOLET, tt: TT, tg: TG } = P);
  LCARS = P.lcars; STATUS_T = P.text;
}
pal();
const statusInk = (_t, s) => LCARS[s] ?? GRAY;
const statusText = (s) => STATUS_T[s] ?? TG;

// short id only: a long hex pane id is noise, so hide it
const shortId = (id) => (id && id.length <= 8 ? id : "");

function toBoard() {
  setShared("lcars.view", "board");
  run("layout.select", { stack: "view", child: "board" });
}

export default class LcarsPane extends View {
  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  glyph(t, id, icon, command, args) {
    return div()
      .id(id)
      .px(8)
      .h(20)
      .flex()
      .items_center()
      .rounded(10)
      .flex_none()
      .bg(GRAY)
      .text_color(INK)
      .hover((s) => s.bg(VIOLET))
      .cursor_pointer()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run(command, args);
      })
      .child(svg(`mods/lcars-pane/${icon}.svg`).size(14).text_color(INK));
  }

  render() {
    pal();
    const t = theme();
    const p = this.me();
    if (!p) return div();
    const pane = p.pane;
    const st = p.status;
    const isTerm = Boolean(props()?.terminal ?? p.terminal ?? true);
    const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const col = statusInk(t, st), colText = statusText(st);
    // a 2px rule under the header: orange while this pane has the keyboard, else the status colour (grey if none)
    return h_flex()
      .id(`kh-head-${pane}`)
      .size_full()
      .px(8)
      .gap(8)
      .items_center()
      .bg(BLACK)
      .border_b(2)
      .border_color(p.focused ? ORANGE : st ? col : GRAY)
      .text_size(12)
      .font_weight(700)
      .on_click(() => run("pane.focus", { pane }))
      .child(
        h_flex()
          .id(`kh-back-${pane}`)
          .h(20)
          .px(8)
          .gap(4)
          .flex_none()
          .items_center()
          .rounded(10)
          .bg(GRAY)
          .text_size(11)
          .text_color(INK)
          .cursor_pointer()
          .hover((s) => s.bg(VIOLET))
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => {
            cx.stop_propagation();
            toBoard();
          })
          .child(svg("mods/lcars-pane/arrow-left.svg").size(12).flex_none().text_color(INK))
          .child("BOARD"),
      )
      .when(Boolean(st), (el) => el.child(div().w(10).h(10).flex_none().rounded_full().bg(col)
        .when(st === "blocked", (e) => e.loop("opacity", { from: 0.4, to: 1, period: 700 }))))
      .child(div().flex_shrink_1().min_w(0).truncate().max_w(260).text_color(TT).child(String(name).toUpperCase()))
      .when(Boolean(st), (el) => el.child(div().flex_none().text_size(11).text_color(colText).child(st.toUpperCase())))
      .child(div().flex_none().font_family(MONO).text_size(11).text_color(t.dim).child(shortId(p.terminal) || shortId(pane)))
      .child(div().flex_1())
      .child(this.glyph(t, `kh-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
      .child(this.glyph(t, `kh-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
      .child(this.glyph(t, `kh-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
      .child(this.glyph(t, `kh-x-${pane}`, "close", "pane.close", { pane }));
  }
}
