// lcars-wave: status trace panel (ship view, between the ship and its terminal; WAVE pill in the bar). WORKING and DONE as stepped traces over the last ~5 min,
// blocked as a red hairline where the count rose plus a lit dot while it is above zero. Samples every 2 s ALL agents
// while this panel is mounted (history starts when it first mounts; lost on reload). Colour = status only.
import { View, div, PathBuilder } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, settings } from "herdr";
import { CAP, EVERY_MS, sample, push, niceMax, ticks, xPct, yPct, steps, blockedRises } from "./wave.js";

// light: the fill hues are too pale as 2 px strokes on cream, so lines use the darker text hues
const DARK = { ground: "#000000", ink: "#ffcc99", dim: "#8888aa", grid: "#666688", working: "#99ccff", done: "#ffcc66", blocked: "#ff5544" };
const LIGHT = { ground: "#fdf6e3", ink: "#586e75", dim: "#586e75", grid: "#8c8ca8", working: "#1d62a3", done: "#7d5c00", blocked: "#b8231a" };
const two = (n) => String(n).padStart(2, "0");
const pct = (n) => `${n}%`;

function trace(buf, key, max, color, width) {
  const pts = steps(buf, key, max);
  if (pts.length < 2) return null;
  const p = PathBuilder.stroke(width).move_to(pct(pts[0][0]), pct(pts[0][1]));
  for (const [x, y] of pts.slice(1)) p.line_to(pct(x), pct(y));
  return window.paint_path(p.build(), color).absolute().inset_0();
}

export default class LcarsWave extends View {
  init(_props, cx) {
    this.buf = [];
    const tick = (cx) => { push(this.buf, sample(agents())); cx.notify(); };
    tick(cx);
    cx.timer.every(EVERY_MS, tick);
  }

  render() {
    const P = settings()?.dark === false ? LIGHT : DARK;
    const buf = this.buf, last = buf[buf.length - 1] ?? { w: 0, d: 0, b: 0 };
    const max = niceMax(buf), spanMin = (CAP * EVERY_MS) / 60000;
    const dotAt = (key, color) => buf.length
      ? div().absolute().right(0).top(pct(yPct(last[key], max))).size(7).rounded(4).mt(-3.5).mr(-3.5).bg(color) : null;
    const label = (txt) => div().text_size(11).font_weight(700).text_color(P.dim).child(txt);
    const legend = (color, word, n, dot) => h_flex().h(20).items_center().gap(8)
      .child(dot ? div().w(14).h(14).flex_none().flex().items_center().justify_center().child(div().size(9).rounded(5).bg(color))
                 : div().w(14).h(3).flex_none().rounded(2).bg(color))
      .child(div().flex_1().text_size(13).font_weight(700).text_color(P.ink).child(word))
      .child(div().text_size(15).font_weight(700).text_color(P.ink).child(two(n)));

    const plot = div().id("wave-plot").relative().flex_1().min_w(0).h_full()
      .border_b_1().border_l_1().border_color(P.grid)
      .children(ticks(max).map((t) => div().absolute().left(0).right(0).top(pct(yPct(t, max))).h(1).bg(P.grid).opacity(0.35)))
      .children([1, 2, 3, 4].map((k) => div().absolute().top(0).bottom(0).left(pct(k * 20)).w(1).bg(P.grid).opacity(0.25)))
      .children(blockedRises(buf).flatMap((i) => {
        const x = pct(xPct(i, buf.length));
        return [div().absolute().top(0).bottom(0).left(x).w(1).bg(P.blocked).opacity(0.8),
          div().absolute().top(0).left(x).size(8).rounded(4).ml(-4).bg(P.blocked)];
      }))
      .children([trace(buf, "d", max, P.done, 2), trace(buf, "w", max, P.working, 2)].filter(Boolean))
      .child(dotAt("d", P.done)).child(dotAt("w", P.working))
      // lit while something is blocked; pulses like the other blocked marks (700 ms, never below 0.7)
      .when(last.b > 0, (el) => el.child(div().absolute().top(0).right(0).size(10).rounded(5).mt(-5).mr(-5).bg(P.blocked)
        .loop("opacity", { from: 0.7, to: 1, period: 700 })));

    // tall and narrow (right of the ship): legend on top, plot below
    return v_flex().id("wave").size_full().p(8).gap(8).bg(P.ground)
      .child(v_flex().gap(2)
        .child(legend(P.working, "WORKING", last.w))
        .child(legend(P.done, "DONE", last.d))
        .child(legend(P.blocked, "NEEDS YOU", last.b, true)))
      .child(h_flex().flex_1().min_h(40).gap(6).pr(8).pt(6)
        .child(div().relative().w(22).h_full().flex_none()
          .children(ticks(max).map((t) => div().absolute().right(0).top(pct(yPct(t, max))).mt(-7).child(label(String(t))))))
        .child(plot))
      .child(h_flex().pl(28).pr(8).justify_between()
        .children([...Array(5)].map((_, i) => label(`-${spanMin - i}`)))
        .child(label("NOW")))
      .child(div().text_size(11).text_color(P.dim).child(`LAST ${spanMin} MIN · ALL SPACES`));
  }
}
