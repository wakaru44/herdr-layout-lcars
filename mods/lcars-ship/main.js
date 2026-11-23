// lcars-ship: spaces as sections of a ship, drawn over a chosen picture (PLAIN = a drawn space dock; see ART below).
// Assignment: click a space chip, then a
// section; click the tray to unassign. Or DRAG (mode C): press a chip, move, release over a section (snap) or the tray
// (unassign); release anywhere else cancels. Drag = down on chip + on_mouse_move on the root (fires while the pointer is
// over the root, which is the whole view) + on_mouse_up on the target. There is no pointer capture: a release outside the
// window is never seen, so the next press anywhere (or any click) clears a stuck drag. Saved in shared "lcars.ship.assign" = { [spaceId]: zoneId }.
// Zone tint = worst status of the spaces in it (blocked > working > done > idle). Colour = status only; the hull is chrome.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, panes, spaces, theme, setShared, shared, settings, run } from "herdr";

const DARK = { ground: "#000000", ink: "#000000", orange: "#ff9900", tan: "#ffcc99", gray: "#666688", lilac: "#cc99cc", tt: "#ffcc99",
  status: { blocked: "#ff5544", working: "#99ccff", done: "#ffcc66", idle: "#9999ff" } };
const LIGHTP = { ground: "#fdf6e3", ink: "#000000", orange: "#ff9900", tan: "#e6b98a", gray: "#8c8ca8", lilac: "#c08fc0", tt: "#586e75",
  status: { blocked: "#f2594a", working: "#7db9ee", done: "#f0be3c", idle: "#9494f5" } };
let P = DARK;
const RANK = ["blocked", "working", "done", "idle"];

// ART (optional): a full-colour PNG can replace the drawn dock as the stage backdrop (see art/README.md). Default and fallback: PLAIN, a
// dock drawn from rects, so the mod needs no image files. ARTS is empty as shipped; add an entry per picture:
//   name: { label, file: "art/name.png", light: "art/name-light.png", w, h, zones: { <zoneId>: [x, y, w, h] }, pills?: { <zoneId>: [x, y, w, h] } }
// zones = the parts of the picture as [x, y, w, h] in its own pixels (drop targets + a faint highlight). pills = optional callout boxes,
// one per zone, that show the zone's label + spaces and expand on hover. The art row in the header only shows when ARTS has entries.
// Choice kept in shared "lcars.ship.art".
const ART_DIR = "mods/lcars-ship";
const ARTS = {};
// PLAIN: a dock in the same 1376x768 box: a spine with 8 bays hanging off it (4 above, 4 below)
const PLAIN = { w: 1376, h: 768, order: ["bridge", "science", "medbay", "engineering", "reactor", "cargo", "hangar", "shields"] };
const bay = (i) => [40 + (i % 4) * 335, i < 4 ? 110 : 488, 290, 170];
const STARS = (() => { let x = 7; const r = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648; return Array.from({ length: 48 }, () => [Math.round(r() * 1370), Math.round(r() * 762), r() < 0.2 ? 3 : 2, r() < 0.5 ? "55" : "33"]); })();
const ART_KEYS = ["plain", ...Object.keys(ARTS)];
const WORD = { working: "WORKING", blocked: "NEEDS YOU", done: "DONE", idle: "STANDING BY" };
const FOREMAN = /^\W*foreman/i; // the tab name starts with foreman (people write a star before it)
const CREW_RANK = { blocked: 0, working: 1, done: 2, idle: 3 };
const glyph = (a) => FOREMAN.test(a.tab_name) ? "lead" : a.program?.key === "claude" ? "person" : a.program?.key === "codex" ? "diamond" : "other";

// the 8 sections, names are only labels
const ZONES_ALL = [["bridge", "BRIDGE"], ["science", "SCIENCE"], ["medbay", "MEDBAY"], ["engineering", "ENGINEERING"],
  ["reactor", "REACTOR"], ["cargo", "CARGO"], ["hangar", "HANGAR"], ["shields", "SHIELDS"]];

export default class Ship extends View {
  init() { this.hov = null; this.pin = null; this.hl = null; this.sel = null; this.drag = null; this.pos = { x: 0, y: 0 }; this.over = null; this.moved = false; this.suppress = false; }

  worst(spaceId, byTab, spaceList) {
    const sp = spaceList.find((s) => s.id === spaceId);
    if (!sp) return null;
    const tabs = new Set(sp.tabs.map((t) => t.id));
    const sts = byTab.filter((x) => tabs.has(x.tab)).map((x) => x.status);
    return RANK.find((r) => sts.includes(r)) ?? null;
  }

  // Agents of a space as little people on a black pill (colour = status): star = foreman, person = claude, diamond = codex,
  // dot = any other harness. Up to 8, then +N. Click a star (lead) or a done one to jump to that agent.
  crew(list, size = 12) {
    const rows = [...list].sort((a, b) => (FOREMAN.test(b.tab_name) - FOREMAN.test(a.tab_name)) || ((CREW_RANK[a.status] ?? 4) - (CREW_RANK[b.status] ?? 4)));
    const jump = (a) => glyph(a) === "lead" || a.status === "done";
    const icon = (a) => {
      const tip = [a.tab_name, WORD[a.status] ?? a.status, a.title && a.title !== a.tab_name ? a.title : ""].filter(Boolean).join(" · ");
      return div().id(`crew-icon-${a.address}`).flex_none().text_color(P.status[a.status] ?? P.gray).tooltip(tip)
        .child(svg(`${ART_DIR}/icons/crew-${glyph(a)}.svg`).size(size))
        .when(jump(a), (el) => el.cursor_pointer().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => { cx.stop_propagation(); run("agent.focus", { terminal: a.address }); }));
    };
    return h_flex().gap(1).items_center().h(size + 4).px(3).bg(P.ink).rounded((size + 4) / 2).flex_none().self_start()
      .children(rows.slice(0, 8).map(icon))
      .when(rows.length > 8, (el) => el.child(div().text_size(10).font_weight(700).text_color(P.gray).child(`+${rows.length - 8}`)));
  }

  // grip (optional): the chip's own drag handle, a darker strip at its left edge inside the rounded outline; the body then only selects
  chip(id, name, crew, status, selected, onClick, onDown, big = false, grip = null) {
    return h_flex().id(`chip-${id}`).items_stretch().flex_none().rounded(11).overflow_hidden()
      .bg(status ? P.status[status] : P.gray).text_color(P.ink).text_size(11).font_weight(700).cursor_pointer()
      .border(2).border_color(selected ? "#ffffff" : status ? P.status[status] : P.gray)
      .opacity(this.drag === id ? 0.35 : 1)
      .hover((s) => s.opacity(0.85)).on_click(onClick).on_mouse_down("left", onDown)
      .when(!!grip, (el) => el.child(div().id(`grip-${id}`).w(16).flex_none().bg("#0000002e").hover((s) => s.bg("#00000047"))
        .cursor_grab().on_mouse_down("left", grip)
        .child(h_flex().size_full().items_center().justify_center().gap(3)
          .child(div().w(2).h(14).rounded(1).bg("#0000008c")).child(div().w(2).h(14).rounded(1).bg("#0000008c")))))
      .child(v_flex().py(2).px(8).gap(2)
        .child(div().whitespace_nowrap().child(String(name).toUpperCase()))
        .when(crew.length > 0, (el) => el.child(this.crew(crew, big ? 18 : 12))));
  }

  render() {
    P = settings()?.dark === false ? LIGHTP : DARK;
    const t = theme();
    const spaceList = spaces();
    const ag = new Map(agents().map((a) => [a.pane, a]));
    const byTab = panes().filter((p) => p.terminal).map((p) => ({ tab: p.tab, status: ag.get(p.pane)?.status ?? p.status ?? "idle" }));
    const assign = shared("lcars.ship.assign") ?? {};
    const save = (next) => setShared("lcars.ship.assign", next);
    const crewOf = (sp) => agents().filter((a) => a.space === sp.id);
    const artKey = ART_KEYS.includes(shared("lcars.ship.art")) ? shared("lcars.ship.art") : "plain";
    const pick = (id) => { this.sel = this.sel === id ? null : id; };
    const assignTo = (id, zone) => { const n = { ...assign }; if (zone) n[id] = zone; else delete n[id]; save(n); };
    const drop = (zone) => { if (this.sel == null) return; assignTo(this.sel, zone); this.sel = null; this.pin = null; };
    // EVENT ORDER: a click on a part is mouse_down (stopped, so the root never sees it) -> mouse_up (release -> endDrag) -> on_click (pin).
    // endDrag used to clear hov+pin on EVERY mouse-up, so a plain click lost its pin (or never opened); it now clears them only after a real drag.
    const endDrag = (cx) => { if (this.moved) { this.hov = null; this.pin = null; } this.drag = null; this.over = null; this.moved = false; cx?.notify(); };
    // mouse up on a target: a drag that moved assigns (snap); otherwise it is the first half of a click and on_click handles it
    const release = (zone, cx) => {
      if (this.drag != null && this.moved) { assignTo(this.drag, zone); this.sel = null; this.suppress = true; }
      endDrag(cx);
    };
    const onChipClick = (id) => (_e, cx) => { cx.stop_propagation(); if (this.suppress) { this.suppress = false; return; } pick(id); cx.notify(); };
    const onChipDown = (id) => (e, cx) => { cx.stop_propagation(); this.suppress = false; this.drag = id; this.dragAt = Date.now(); this.moved = false; this.pos = e.position; this.start = e.position; this.org = { x: 0, y: 0 }; };

    const chipsIn = (zone) => spaceList.filter((s) => assign[s.id] === zone).map((s) =>
      this.chip(s.id, s.name, crewOf(s), this.worst(s.id, byTab, spaceList), this.sel === s.id, onChipClick(s.id), onChipDown(s.id)));

    const light = P === LIGHTP;
    const label = Object.fromEntries(ZONES_ALL);
    const statOf = (id) => spaceList.filter((s) => assign[s.id] === id).map((s) => this.worst(s.id, byTab, spaceList))
      .reduce((best, v) => (v && (!best || RANK.indexOf(v) < RANK.indexOf(best)) ? v : best), null);
    const armed = this.sel != null || (this.drag != null && this.moved);
    const dragMoved = this.drag != null && this.moved;
    // pointer over a zone part or pill: highlight; over a pill (not mid-drag): open the card
    const enter = (id, card) => (_e, cx) => {
      const want = card && !dragMoved ? id : this.hov;
      if (this.over !== id || this.hl !== id || this.hov !== want) { this.over = id; this.hl = id; this.hov = want; cx.notify(); }
    };
    const leave = (id) => (hv, cx) => { if (!hv && this.hl === id) { this.hl = null; if (this.over === id) this.over = null; cx.notify(); } };

    // STAGE: a box of the picture's aspect, the largest that fits, centred (sized by hand: no object-fit). The stage size is
    // measured from the pointer events that cross it; until the first one, estimated from the window.
    const unassigned = spaceList.filter((s) => !assign[s.id]);
    const TRAY_W = 160, TRAY_GAP = 12;
    const trayReserved = unassigned.length > 0;                 // chips waiting: a real column beside the stage
    const trayShow = trayReserved || dragMoved;                 // else it only appears (as an overlay) while a drag is in progress
    const vp = window.viewport_size();
    const lost = trayReserved ? TRAY_W + TRAY_GAP : 0;
    // the stage = the view's real size (on_size_change on the root) minus its padding (16+16), the header row (26) and one gap (12);
    // the tray column takes its width off. Only until the first size event: a rough guess from the window.
    const st = this.root ? { width: this.root.width - 32 - lost, height: this.root.height - 70 } : { width: vp.width - 300 - lost, height: vp.height * 0.33 };
    const art = ARTS[artKey];
    const bw0 = art?.w ?? PLAIN.w, bh0 = art?.h ?? PLAIN.h;
    const k = Math.max(0.1, Math.min((st.width - 4) / bw0, (st.height - 4) / bh0));
    const iw = Math.floor(bw0 * k), ih = Math.floor(bh0 * k);
    const px = (v) => Math.round(v * k);
    const at = (el, [x, y, w, h]) => el.absolute().left(px(x)).top(px(y)).w(px(w)).h(px(h));
    // click a part or pill: with a space selected it assigns (click-click); otherwise it pins that section's card open (click again to close)
    const hit = (el, id) => el.cursor_pointer().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { if (this.sel != null || !art?.pills) drop(id); else { this.pin = this.pin === id ? null : id; cx.notify(); } })
      .on_mouse_up("left", (_e, cx) => release(id, cx));

    // a part of the ship: faint outline, brighter when hovered or a drop target; no chips when the pills carry them
    const part = (id) => {
      const stat = statOf(id), on = this.hl === id || (dragMoved && this.over === id);
      return hit(at(div().id(`zone-${id}`), art.zones[id]).rounded(6).border(on ? 2 : 1)
        .border_color(dragMoved && this.over === id ? "#ffffff" : on ? P.tan : armed ? P.tan + "55" : "#00000000")
        .bg(on ? (stat ? P.status[stat] + "55" : P.orange + "33") : "#00000000")
        .on_mouse_move(enter(id, false)).on_hover(leave(id)), id)
        .when(!art.pills, (el) => el.p(2).child(v_flex().gap(2).items_start()
          .when(chipsIn(id).length === 0, (e) => e.child(div().self_start().px(3).rounded(4).bg(light ? "#fdf6e3cc" : "#00000099").text_size(9).font_weight(700).text_color(P.tt).child(label[id])))
          .children(chipsIn(id))));
    };
    // a callout pill of the picture: zone name + its spaces, compact
    const pill = (id) => {
      const [, , w, h] = art.pills[id], stat = statOf(id), mine = spaceList.filter((s) => assign[s.id] === id);
      const wide = px(w) >= 90, on = this.hl === id || (dragMoved && this.over === id);
      const names = mine.length ? mine.slice(0, 2).map((s) => String(s.name).toUpperCase()).join(" · ") + (mine.length > 2 ? ` +${mine.length - 2}` : "") : "";
      return hit(at(h_flex().id(`pill-${id}`), art.pills[id]).rounded(px(h) / 2).border(on || stat || art.drawn ? 2 : 0)
        .border_color(dragMoved && this.over === id ? "#ffffff" : stat ? P.status[stat] : P.tan)
        .bg(art.drawn ? (stat ? P.status[stat] : P.lilac) : stat ? P.status[stat] + "66" : on ? "#ffffff22" : "#00000000")
        .on_mouse_move(enter(id, true)).on_hover(leave(id)), id)
        .items_center().px(6).gap(5).overflow_hidden()
        .child(div().flex_none().text_size(wide ? 10 : 8).font_weight(700).text_color(P.ink).whitespace_nowrap().child(label[id]))
        .when(wide && names, (el) => el.child(div().min_w(0).text_size(10).text_color(P.ink).truncate().child(names)))
        .when(!wide && mine.length > 0, (el) => el.child(div().flex_none().text_size(8).font_weight(700).text_color(P.ink).child(String(mine.length))));
    };
    // the hover card: grows out of its pill, floats above everything, one row per space with bigger crew icons
    const card = (id) => {
      const [x, y, w, h] = art.pills[id], mine = spaceList.filter((s) => assign[s.id] === id), cw = 340;
      const right = x + w / 2 > bw0 / 2, low = y > bh0 / 2;
      let el = v_flex().id(`card-${id}`).absolute().w(cw).gap(6).p(8).rounded(12).border(2).border_color(P.orange).bg(P.ground)
        .on_hover((hv, cx) => { if (!hv && this.hov === id && this.drag == null) { this.hov = null; this.hl = null; this.over = null; cx.notify(); } })
        .on_mouse_move((_e, cx) => { cx.stop_propagation(); this.over = id; })
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(() => drop(id)).on_mouse_up("left", (_e, cx) => release(id, cx))
        .child(div().text_size(11).font_weight(700).text_color(P.tt).child(`${label[id]} · ${mine.length ? mine.length + " SPACE" + (mine.length > 1 ? "S" : "") : "EMPTY, DROP A SPACE HERE"}`))
        .children(mine.map((s) => h_flex().id(`row-${s.id}`).gap(6).items_center()
          .child(this.chip(s.id, s.name, crewOf(s), this.worst(s.id, byTab, spaceList), this.sel === s.id,
            onChipClick(s.id), (_e, cx) => cx.stop_propagation(), true, onChipDown(s.id)))
          .child(div().id(`unassign-${s.id}`).flex_none().px(6).h(20).rounded(10).border(1).border_color(P.gray).text_color(P.tt).text_size(9).font_weight(700)
            .items_center().cursor_pointer().hover((h) => h.bg("#ffffff22")).whitespace_nowrap()
            .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
            .on_click((_e, cx) => { cx.stop_propagation(); assignTo(s.id, null); this.pin = null; this.hov = null; cx.notify(); })
            .child("✕ UNASSIGN"))));
      el = right ? el.left(px(x + w) - cw) : el.left(px(x));
      return low ? el.bottom(ih - px(y + h)) : el.top(px(y));
    };

    const frame = (kids) => h_flex().id("ship-art").flex_1().min_h(0).min_w(0).items_center().justify_center().overflow_hidden().bg(P.ground)
      .child(v_flex().id("ship-box").relative().w(iw).h(ih).flex_none().children(kids));

    let ship;
    if (art) {
      const kids = [image(`${ART_DIR}/${light ? art.light : art.file}`).absolute().left(0).top(0).w(iw).h(ih),
        ...ZONES_ALL.map(([id]) => part(id))];
      if (art.pills) kids.push(...ZONES_ALL.map(([id]) => pill(id)));
      if (art.pills && (this.hov ?? this.pin)) kids.push(card(this.hov ?? this.pin));
      ship = frame(kids);
    } else {
      // PLAIN: starfield, a dock spine with 8 bays; the bays are the zones (hit areas + chips)
      const rim = light ? P.orange : P.orange;
      const bayEl = (id, i) => {
        const stat = statOf(id), r = bay(i), hot = dragMoved && this.over === id;
        return hit(at(v_flex().id(`zone-${id}`), r).gap(3).p(6).rounded(14).border(hot ? 3 : 2)
          .border_color(hot ? "#ffffff" : armed ? P.tan : rim).bg(stat ? P.status[stat] + "33" : P.ground)
          .on_mouse_move(enter(id, false)).on_hover(leave(id)), id)
          .child(div().text_size(10).font_weight(700).text_color(P.tt).child(label[id]))
          .child(v_flex().gap(3).items_start().children(chipsIn(id)));
      };
      const kids = [
        ...STARS.map(([x, y, z, a]) => div().absolute().left(px(x)).top(px(y)).w(z).h(z).rounded(2).bg((light ? "#586e75" : "#ffffff") + a)),
        at(div().id("dock-spine"), [20, 335, 1336, 98]).rounded(49).bg(P.lilac),
        at(div().id("dock-core"), [90, 355, 1196, 58]).rounded(29).bg(P.ground),
        at(div().id("dock-nose"), [1290, 365, 80, 38]).rounded(19).bg(P.orange),
        at(div().id("dock-tail"), [6, 365, 80, 38]).rounded(19).bg(P.orange),
        ...PLAIN.order.map((id, i) => { const [x, y, w, h] = bay(i); return at(div().id(`dock-arm-${id}`), [x + w / 2 - 14, i < 4 ? y + h : 433, 28, i < 4 ? 335 - (y + h) : 488 - 433]).bg(P.lilac); }),
        ...PLAIN.order.map(bayEl),
      ];
      ship = frame(kids);
    }

    const tray = v_flex().id("tray").w(TRAY_W).flex_none().gap(6).p(8).rounded(10).border(2).overflow_hidden().bg(P.ground)
      .border_color(dragMoved ? "#ffffff" : this.sel != null && assign[this.sel] ? P.tan : P.gray).cursor_pointer()
      .when(!trayReserved, (el) => el.absolute().left(0).top(0).bottom(0)).when(trayReserved, (el) => el.self_start())
      .on_click(() => { if (this.sel == null) return; assignTo(this.sel, null); this.sel = null; })
      .on_mouse_up("left", (_e, cx) => release(null, cx))
      .child(div().text_size(10).font_weight(700).text_color(P.tt).child(unassigned.length ? "UNASSIGNED" : "DROP HERE TO UNASSIGN"))
      .child(v_flex().gap(6).items_start().children(unassigned.map((s) =>
        this.chip(s.id, s.name, crewOf(s), this.worst(s.id, byTab, spaceList), this.sel === s.id, onChipClick(s.id), onChipDown(s.id)))));
    // the stage and the tray side by side; the tray column is left out entirely when nothing is unassigned (overlay while dragging)
    const stageRow = h_flex().id("stage-row").flex_1().min_h(0).gap(TRAY_GAP).relative()
      .when(trayReserved, (el) => el.child(tray)).child(ship).when(!trayReserved && trayShow, (el) => el.child(tray));

    const dragging = this.drag != null && this.moved ? spaceList.find((s) => s.id === this.drag) : null;
    const hint = dragging ? "RELEASE OVER A SECTION (OR THE TRAY TO UNASSIGN)" : this.sel != null ? "NOW CLICK A SECTION (OR THE TRAY TO UNASSIGN)" : "DRAG A SPACE ONTO A SECTION, OR CLICK, THEN CLICK";
    return v_flex().id("ship").relative().size_full().min_w(0).bg(t.canvas).p(16).gap(12)
      .on_size_change((size, cx) => { if (!this.root || Math.abs(size.width - this.root.width) > 2 || Math.abs(size.height - this.root.height) > 2) { this.root = { width: size.width, height: size.height }; cx.notify(); } })
      .on_mouse_move((e, cx) => {
        if (this.drag == null) return;
        if (Date.now() - this.dragAt > 8000) { endDrag(cx); return; } // a missed mouse-up (released outside the view) never leaves a drag stuck
        this.dragAt = Date.now();
        this.pos = e.position; this.org = { x: e.position.x - e.local_position.x, y: e.position.y - e.local_position.y };
        if (!this.moved && Math.hypot(e.position.x - this.start.x, e.position.y - this.start.y) > 4) this.moved = true;
        if (this.moved) cx.notify();
      })
      .on_mouse_down("left", (_e, cx) => { if (this.drag != null) endDrag(cx); else if (this.pin != null) { this.pin = null; cx.notify(); } }) // a press anywhere else clears a stuck drag / closes a pinned card
      .on_mouse_up("left", (_e, cx) => { if (this.drag != null) { if (this.moved) this.suppress = true; endDrag(cx); } })
      .child(h_flex().flex_none().h(26).justify_between().items_end()
        .child(div().text_size(18).font_weight(700).text_color(P.orange).child("SHIP VIEW · SPACES AS SECTIONS"))
        .child(h_flex().gap(14).items_center()
          .when(ART_KEYS.length > 1, (el) => el.child(h_flex().gap(6).items_center()
            .child(div().text_size(12).font_weight(700).text_color(P.tt).child("ART:"))
            .children(ART_KEYS.map((k) => div().id(`art-${k}`).h(22).px(10).flex_none().rounded(11).border(2).border_color(P.orange)
              .bg(k === artKey ? P.orange : P.ground).text_color(k === artKey ? P.ink : P.orange).text_size(11).font_weight(700)
              .cursor_pointer().hover((s) => s.opacity(0.85)).on_click(() => setShared("lcars.ship.art", k))
              .child(ARTS[k]?.label ?? "PLAIN")))))
          .child(div().text_size(12).font_weight(700).text_color(P.tt).child(hint))))
      .child(stageRow)
      // drag ghost: window position, offset so the pointer is never over it (it would steal the drop target)
      .when(!!dragging, (el) => el.child(this.chip("ghost", dragging.name, crewOf(dragging), this.worst(dragging.id, byTab, spaceList), false, () => {}, () => {})
        .absolute().left(this.pos.x - this.org.x + 14).top(this.pos.y - this.org.y + 14).opacity(0.9)));
  }
}
