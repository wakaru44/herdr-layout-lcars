// lcars-termhead: thin strip above a foldable block. Label at the left, a pill at the right: X hides the target
// node, "SHOW" brings it back. props { target, label, box, restore, collapsed }; label "TERMINAL" shows the focused agent's name instead.
import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { layout, run, props, agents, focused, settings } from "herdr";

const DARK = { ground: "#000000", ink: "#000000", tan: "#ffcc99", orange: "#ff9900", gray: "#666688", violet: "#9999ff" };
const LIGHT = { ground: "#fdf6e3", ink: "#000000", tan: "#586e75", orange: "#ff9900", gray: "#8c8ca8", violet: "#9494f5" };
const find = (n, id) => n?.id === id ? n : (n?.children ?? []).reduce((f, c) => f ?? find(c, id), null);

export default class LcarsTermhead extends View {
  render() {
    const C = settings()?.dark === false ? LIGHT : DARK;
    const { target, label, box, restore, collapsed } = props() ?? {};
    const node = find(layout(), target), shown = Boolean(node) && !node.hidden;
    const f = focused(), a = agents().find((x) => x.terminal === (f?.agent ?? f?.terminal));
    const name = label === "TERMINAL" ? (a?.title || a?.tab_name || "TERMINAL") : label;
    return h_flex().id("termhead").size_full().items_center().gap(8).px(6).bg(C.ground)
      .child(div().flex_1().min_w(0).truncate().text_size(12).font_weight(700).text_color(C.tan).child(String(name).toUpperCase()))
      .child(div().id("termhead-toggle").h(20).px(10).flex_none().flex().items_center().rounded(10).bg(C.orange).text_color(C.ink)
        .text_size(12).font_weight(700).cursor_pointer().hover((s) => s.bg(C.violet))
        .on_click(() => {
          // the box gives its space back when folded (collapsed px, default 24) and takes it again from props.restore
          run(shown ? "layout.hide" : "layout.show", { id: target });
          if (box) run("layout.resize", { id: box, ...(shown ? { px: collapsed ?? 24 } : restore) });
        })
        .child(shown ? "✕" : "▴ SHOW"));
  }
}
