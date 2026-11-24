# Ship art: agent setup brief

You were asked to set up the ship art for the `lcars-bridge` layout. The ship view works without any picture (it draws a plain space dock);
this adds an AI-generated one behind the spaces. The repo ships no pictures, so you generate one.

**Ask the user before using any paid image API.** Use an image tool you already have (and they already pay for), or ask them to supply a PNG.

## 1. Generate 3-4 candidates

Use the prompts in [PROMPTS.md](PROMPTS.md) (the first one, or the generic variant if the user wants no Star Trek names):

- 16:9, pure black background, flat 2D line art, no text of any kind;
- 7-8 empty rounded callout pills with thin leader lines pointing at ship parts;
- pick the candidate whose pills sit in a clean left / right / bottom arrangement and whose parts are easy to tell apart.
  Reject busy interiors and anything with gibberish letters. Do not draw it yourself as SVG/vector; it comes out badly.

## 2. Save it

Save as `mods/lcars-ship/art/<name>.png` in the Herdr config home (for example `mine.png`). A real file, never a symlink (Herdr does not
draw images behind symlinks). Read its pixel size `W x H` (for example 1376x768); you need it below.

## 3. Make the light variant

```sh
python3 tools/make-light-art.py --in mods/lcars-ship/art/<name>.png --out mods/lcars-ship/art/<name>-light.png
```

Needs python3 and Pillow. It keys the black away (alpha = max(r,g,b)/255), un-premultiplies the colour, darkens (x0.78) and saturates
(x1.15) a little so thin strokes read on cream, and composites over `#fdf6e3`. Options: `--bg`, `--dark`, `--sat`. Look at the result;
tweak `--dark` if lines are too faint.

## 4. Register it in `mods/lcars-ship/main.js`

Edit the `ARTS` table near the top (empty as shipped). The real shape:

```js
const ARTS = {
  <name>: {
    label: "MINE",                       // text of the ART: pill in the view header (the pill row shows when ARTS has an entry)
    file: "art/<name>.png",              // relative to mods/lcars-ship/
    light: "art/<name>-light.png",       // used when settings().dark === false
    w: 1376, h: 768,                     // the picture's own pixel size
    drawn: false,                        // true if the picture has NO pills: the mod draws filled pills itself
    zones: { bridge: [x, y, w, h], ... },  // the hull PART each leader line points at (drop target + faint highlight)
    pills: { bridge: [x, y, w, h], ... },  // optional per zone (auto-placed if missing): the callout pill the leader line starts at (label + spaces; hover opens a card)
  },
};
```

Facts about the code (read it before you trust this):

- The image box is the largest `w:h` rectangle that fits the stage, centred. **Every rect is `[x, y, w, h]` in the picture's own pixels**
  (not fractions); the mod scales them by the displayed size / `w`. So measure on the original PNG.
- Zone ids are exactly: `bridge`, `science`, `medbay`, `engineering`, `reactor`, `cargo`, `hangar`, `shields`. Give a `zones` rect for every id
  you want usable. **`pills` is optional per zone**: a zone without a `pills` rect gets one placed automatically from its `zones` rect, the same
  size as the other pills (about 150x34 picture px if there are none), centred on the part, above it if it fits inside the picture and else
  below, clamped inside the box and nudged sideways off other pills. It behaves like any pill (name + spaces, hover card, click, drop target).
  Image models do not always honour counts: **count the pills you actually got** and fill `pills` only for those; let the rest auto-place.
  If the picture has no pills at all, omit `pills` and the chips sit inside the part rects instead.
- A `part` (zones entry) is the area the user drops a chip on and the highlight shown on hover; a `pill` is a small box over the picture's
  empty pill: label `NAME` plus the names of up to two spaces, and a card on hover (pinned on click).
- Pills over about 90 px wide show a label and names; narrower ones show a count only.
- `drawn: true` (isometric wireframe style): the picture has no pills, so give `pills` rects in empty margins beside the parts; the mod
  paints lilac (or status coloured) filled pills there.

Procedure:

1. View the image. For each pill, follow its leader line to the ship part it touches and assign a zone id (any consistent mapping; the
   labels are only names).
2. Estimate `pills[id]` (the pill's box) and `zones[id]` (a box around the part) in picture pixels.
3. Reload and refine: `touch -h` the `mods/lcars-ship` directory entry (if it is a symlink) and the layout json, or just save the file if
   the config home holds real files. Take `herdr-app shot crop.png`, look at where the highlights land, adjust, repeat.

### Example (invented rects for a made-up 1376x768 picture; do not copy)

```js
const ARTS = {
  demo: { label: "DEMO", file: "art/demo.png", light: "art/demo-light.png", w: 1376, h: 768,
    zones: {
      bridge: [300, 285, 180, 60],  science: [840, 290, 460, 62], medbay: [300, 350, 180, 80], engineering: [482, 330, 140, 190],
      reactor: [628, 415, 145, 115], cargo: [820, 355, 200, 65],  shields: [880, 425, 165, 70], hangar: [880, 497, 165, 55] },
    pills: {
      bridge: [40, 181, 192, 49],   engineering: [40, 107, 230, 48], medbay: [40, 579, 208, 49], reactor: [730, 579, 87, 49],
      science: [1127, 107, 208, 48], cargo: [1127, 181, 208, 49],   shields: [1127, 475, 208, 47], hangar: [1127, 579, 208, 49] } },
};
```

## 5. Acceptance checklist

- The picture fills the stage without stretching (aspect kept, letterboxed on the ground colour).
- Every highlight/pill box sits exactly on its picture pill; every zone box covers the part its leader line points at.
- Hover opens the card, click pins it, dragging a space chip onto a part or pill assigns it, dropping on the tray unassigns.
- Light mode (`cmd-shift-m`) shows the `-light` picture and strokes are legible on cream.
- `herdr-app check mods/lcars-ship` passes.
- Nothing else changed in the repo. Do not commit the pictures.
