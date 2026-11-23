// lcars-goto: "Go to terminal" finder (key cmd-o, see keys.json). Lists every live terminal, agents and plain shells.
// Type words: a terminal matches when ANY word is in ANY of id, name, title, space, tab, folder, program (rank.js, OR).
// Up/Down + Enter (or click) jumps: shows its space and tab, focuses its pane. Esc closes.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { agents, panes, spaces, terminals, run, settings, props, closeOverlay } from "herdr";
import { gotoSort } from "./rank.js";

const DARK = { ground: "#000000", orange: "#ff9900", tan: "#ffcc99", dim: "#997755", lilac: "#cc99cc", hover: "#1a1410", ink: "#000000",
  status: { blocked: "#ff5544", working: "#99ccff", done: "#ffcc66", idle: "#9999ff" } };
const LIGHT = { ground: "#fdf6e3", orange: "#ff9900", tan: "#586e75", dim: "#8c8ca8", lilac: "#c08fc0", hover: "#f0e6cc", ink: "#000000",
  status: { blocked: "#f2594a", working: "#7db9ee", done: "#f0be3c", idle: "#9494f5" } };
const ROW = 32, MAXH = 440;

const tail = (p) => (p ?? "").split("/").filter(Boolean).slice(-2).join("/");

function build() {
  const ags = new Map(agents().map((a) => [a.address, a]));
  const ps = panes();
  const sp = spaces();
  return terminals().filter((t) => t.state === "live").map((t) => {
    const a = ags.get(t.address);
    const pane = ps.find((p) => p.terminal === t.address);
    const space = pane && sp.find((s) => s.tabs.some((x) => x.id === pane.tab));
    const tab = space?.tabs.find((x) => x.id === pane.tab);
    const [w0, ...w1] = (t.where ?? "").split(" / ");
    const project = space?.name ?? a?.space_name ?? w0 ?? "";
    const tabName = tab?.name ?? a?.tab_name ?? w1.join(" / ");
    const status = a?.status ?? t.status ?? null;
    const prog = t.program?.name ?? a?.program?.name ?? t.agent ?? "";
    const title = pane?.title ?? a?.title ?? "";
    const cwd = pane?.cwd ?? t.cwd ?? "";
    return {
      id: t.address, name: t.name ?? "", title, project, tab: tabName, prog, cwd, status,
      agent: !!(a || t.status), seq: a?.seq ?? 0, pane: pane?.pane ?? null, tabId: pane?.tab ?? a?.tab ?? null, spaceId: space?.id ?? a?.space ?? null,
      fields: [t.address, t.name, title, project, tabName, cwd, prog, t.agent],
    };
  }).filter((r) => r.pane || r.agent);
}

export default class Goto extends View {
  init() {
    this.at = 0;
    this.scroll = 0;
    this.input = InputState.new({ placeholder: "Go to a terminal: id, name, project, path…" });
    this.input.on("change", (_e, cx) => { this.at = 0; this.scroll = 0; cx.notify(); });
    this.input.on("submit", (_e, cx) => this.go(this.list()[this.at], cx));
    this.input.focus();
  }

  list() { return gotoSort(this.input.value(), build()); }

  close() { closeOverlay(props().overlay); }

  go(r) {
    if (!r) return;
    this.close();
    if (r.spaceId) run("space.select", { id: r.spaceId });
    if (r.tabId) run("tab.select", { id: r.tabId });
    if (r.pane) run("pane.focus", { terminal: r.id });
    else run("agent.focus", { terminal: r.id });
  }

  render() {
    const P = settings()?.dark === false ? LIGHT : DARK;
    const rows = this.list();
    this.at = Math.max(0, Math.min(this.at, rows.length - 1));
    const total = rows.length * ROW;
    const height = Math.min(MAXH, total || ROW);
    const maxScroll = Math.max(0, total - height);
    // keep the selected row in view
    if (this.at * ROW < this.scroll) this.scroll = this.at * ROW;
    if ((this.at + 1) * ROW > this.scroll + height) this.scroll = (this.at + 1) * ROW - height;
    this.scroll = Math.max(0, Math.min(this.scroll, maxScroll));
    const first = Math.floor(this.scroll / ROW);
    const last = Math.min(rows.length, Math.ceil((this.scroll + height) / ROW));

    const row = (r, i) => {
      const on = i === this.at;
      const col = r.status ? P.status[r.status] ?? P.lilac : P.dim;
      return h_flex().id(`go-${i}`).absolute().left(0).right(0).top(i * ROW - this.scroll).h(ROW)
        .px(10).gap(10).items_center().rounded(16).cursor_pointer()
        .when(on, (el) => el.bg(P.hover)).hover((s) => s.bg(P.hover))
        .on_click(() => this.go(r))
        .child(div().w(12).flex_none().text_color(col).child(r.status ? "●" : "·"))
        .child(div().w(54).flex_none().font_family("Menlo").text_size(12).text_color(P.orange).child(r.id))
        .child(div().flex_1().min_w(0).truncate().text_color(P.tan).child(r.name || r.title || "—"))
        .child(div().w(190).flex_none().truncate().text_size(11).text_color(P.lilac).child([r.project, r.tab].filter(Boolean).join(" · ")))
        .child(div().w(84).flex_none().truncate().text_size(11).text_color(P.dim).child(r.prog))
        .child(div().w(150).flex_none().truncate().text_size(11).text_color(P.dim).child(tail(r.cwd)));
    };

    return v_flex().id("goto").w_full().min_h(0).p(18).gap(10).bg(P.ground).text_size(13)
      .on_key_down((e, cx) => {
        const k = e.key;
        if (k === "escape") return this.close();
        if (k === "down") this.at = Math.min(rows.length - 1, this.at + 1);
        else if (k === "up") this.at = Math.max(0, this.at - 1);
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(h_flex().items_center().gap(10)
        .child(div().px(14).h(26).flex_none().items_center().rounded(13).bg(P.orange).text_color(P.ink).font_semibold().text_size(13).child("GO TO TERMINAL"))
        .child(div().flex_1().text_size(11).text_color(P.dim).child(`${rows.length} terminal${rows.length === 1 ? "" : "s"} · any word matches`))
        .child(div().id("goto-esc").px(8).py(2).rounded(8).text_size(11).text_color(P.dim).cursor_pointer().hover((s) => s.bg(P.hover)).on_click(() => this.close()).child("Esc")))
      .child(h_flex().h(36).flex_none().px(14).items_center().rounded(18).border_1().border_color(P.lilac).bg(P.ground)
        .child(Input.new(this.input).flex_1().h_full().text_size(13).text_color(P.tan)))
      .child(v_flex().id("go-list").h(height).min_h(0).mb(6).overflow_hidden()
        .on_scroll_wheel((e, cx) => {
          this.scroll = Math.max(0, Math.min(this.scroll - e.delta.y, maxScroll));
          this.at = Math.max(Math.min(this.at, Math.floor((this.scroll + height - 1) / ROW)), Math.ceil(this.scroll / ROW));
          cx.notify();
        })
        .children(rows.slice(first, last).map((r, k) => row(r, first + k))));
  }
}
