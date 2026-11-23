// lcars-term: the header of the quick terminal window (lcars-bar opens it: a window overlay whose layout is this
// header over a `{ terminal }` block). Pin keeps it open when focus leaves; close only hides it, the shell keeps running.
// Props: { overlay, folder }. State: shared "lcars.term.pinned" / "lcars.term.open".
import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { props, shared, setShared, closeOverlay, settings } from "herdr";

const DARK = { ground: "#000000", ink: "#000000", orange: "#ff9900", gray: "#666688", violet: "#9999ff", tan: "#ffcc99" };
const LIGHT = { ground: "#fdf6e3", ink: "#000000", orange: "#ff9900", gray: "#8c8ca8", violet: "#9494f5", tan: "#586e75" };

export default class LcarsTerm extends View {
  render() {
    const C = settings()?.dark === false ? LIGHT : DARK;
    const pinned = shared("lcars.term.pinned") === true;
    const stop = (_e, cx) => cx.stop_propagation(); // a press on a control must not start dragging the window
    const pill = (id, label, on, action) => div().id(id).h(24).px(12).flex_none().flex().items_center().rounded(12)
      .text_color(C.ink).text_size(12).font_weight(700).cursor_pointer().bg(on ? C.orange : C.gray)
      .hover((s) => s.bg(on ? C.orange : C.violet)).on_mouse_down("left", stop).on_click(action).child(label);
    return h_flex().size_full().px(8).gap(8).items_center().bg(C.ground)
      .child(div().text_color(C.orange).text_size(14).font_weight(700).child(`TERM · ${String(props()?.folder ?? "").split("/").filter(Boolean).pop() ?? ""}`.toUpperCase()))
      .child(div().flex_shrink_1().min_w(0).truncate().text_size(11).text_color(C.tan).child(props()?.folder ?? ""))
      .child(div().flex_1())
      .child(pill("term-pin", pinned ? "PINNED" : "PIN", pinned, () => setShared("lcars.term.pinned", !pinned)))
      .child(pill("term-close", "HIDE", false, () => { setShared("lcars.term.open", false); closeOverlay(props()?.overlay); }));
  }
}
