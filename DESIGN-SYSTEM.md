# lcars-bridge design system

Style guide for the `lcars-bridge` Herdr layout: what the look is made of, the rules behind it, and where the build
still departs from them. Written from the code as it is (not as intended) plus three research passes
(LCARS canon, existing implementations, dashboard/accessibility patterns).

Evidence tags used below: **[canon]** from Star Trek production sources, **[community]** from fan implementations,
**[computed]** measured by `check-contrast.py`, **[inference]** our judgment. Where a source is named, it is in
"Sources" at the end.

## 1. What it is

A black window carved into flat, saturated **slabs** joined by **elbows**, with black labels in a condensed all-caps face.
It frames a developer tool (terminals + AI agents), so the LCARS vocabulary is mapped to function: slabs are spaces and
agents, pills are tabs and toggles, colour is agent status. Nothing is decorative gradient or glow.

Not a web page: Herdr draws native rectangles with per-corner radii, text and small SVG icons. No CSS, no shadows we rely on.

Where the values live (there is no shared token module yet, see Backlog):

| What | File |
|---|---|
| Window theme colours, 16 ANSI slots, pane frame, layout tree and sizes | `layouts/lcars-bridge.json` |
| Elbows, sidebar, status arm, wordmark (palette `C`, `SIDE`, `ARM`, `GAP`) | `mods/lcars-frame/main.js` |
| View toggle, tab pills, panel toggles, window buttons | `mods/lcars-bar/main.js` |
| Board columns, cards, selection | `mods/lcars-board/main.js` |
| Pane header (back, status, split/zoom/close) | `mods/lcars-pane/main.js` |

## 2. Principles

1. **Black ground, flat colour.** Everything sits on `#000000`; blocks are flat fills, 4px of black between them. [canon+community]
2. **Black text on fills.** Labels on slabs are black, set bottom-right. Light text appears only on black. [community, lambtor rule]
3. **Colour means function.** Orange/peach/lilac/tan are chrome; blue/red/gold/violet are status and nothing else. [community]
4. **Condensed caps for chrome.** Antonio bold, ALL CAPS, short nouns, zero-padded counts. Anything user-authored or code-like is not chrome (see Typography).
5. **Static unless it needs you.** The only motion is status pulses; hover changes opacity or turns violet. [inference; TNG panels are mostly static]
6. **Shape carries the identity.** Keep the elbow and pill end caps even when space is tight.

## 3. Palette

| Token | Hex | Role | Black-label contrast | Provenance |
|---|---|---|---|---|
| black | `#000000` | ground, text on slabs | n/a | canon |
| orange | `#ff9900` | primary chrome, active, focus | 9.81 | community (no source gives this exact value; sources use `#ff9933`/`#eb943a`) |
| peach | `#ff9966` | chrome, space slabs | 10.00 | inference |
| gold | `#ffcc66` | status DONE, stardate | 14.08 | community (trekcolors golden-tanoi) |
| tan | `#ffcc99` | body text, chrome | 14.35 | community (trekcolors tanoi) |
| lilac | `#cc99cc` | chrome, labels | 9.00 | community |
| violet | `#9999ff` | status IDLE, hover | 8.35 | community |
| blue | `#99ccff` | status WORKING | 12.44 | community |
| sky | `#5599ff` | status arm | 7.39 | inference |
| red | `#ff5544` | status BLOCKED, alert | 6.63 | inference |
| grey | `#666688` | neutral slabs, borders, dim text | **3.82** | community (fan "dim" grey, also in ha-lcars) |
| popover | `#0a0a12` | menus | n/a | ours |
| raised | `#14141f` | hover / raised surfaces | n/a | ours |
| selection | `#5a3a00` | terminal selection | n/a | ours |

Terminal: background `#000000`, text `#ffcc99`, cursor `#ff9900`. ANSI slots 0–15 are defined in the layout; slot 8
(bright black) is the grey, so dim CLI text inherits the grey's contrast problem.

## 4. Status language

| State | Word | Colour | Notes |
|---|---|---|---|
| working | `WORKING` | blue | |
| blocked | `NEEDS YOU` | red | pulses |
| done | `DONE` | gold | shows until the user looks, then becomes idle |
| idle | `STANDING BY` | violet | |
| unknown | | grey | |

Shown as: a 14px strip (left edge of crew rows and board cards, rounded on its left side), a tab-pill fill, a header dot,
a board column slab, and counts in the status arm. The active tab is always orange regardless of status.
Colour is the main carrier today; see Backlog for the redundant glyph/fill cue.

## 5. Geometry (px at zoom 1)

| Element | Value |
|---|---|
| Top bar | 64 tall; elbow 210 wide, outer radius 44; inner (concave) radius 26 |
| Top arm | 20 tall: orange 160, lilac 70, tan (fills), blue 46 with 10 end radius |
| Sidebar | 210 wide, fixed (min = max); orange carry-down slab 18; label slabs 26; space slabs 40; new-space slab 30; crew rows 40 (strip 14, left radius 15) |
| Bottom bar | 44 tall; grey elbow 210, outer radius 40, inner 22; arm 16: grey 120, sky (fills), peach 90, orange 46 with 8 end radius |
| Gap between blocks | 4 (work area uses 8) |
| Work area | padding 8 / 12; bar 30 |
| Pills | radius 15 on 30 tall (full end cap); side padding 14–16; separator 4×22, radius 2 |
| Pane frame | radius 10, border 2 (grey; orange focused), gap 8, header 30 with a 2px rule |
| Board | cards 55% / quick terminal 45% (draggable, mins 160 / 120); column header 36, top-left radius 18; card radius 10, border 2, strip 14 |
| Side panel | 280 wide (240–900), padding 8 / 12; hidden until toggled |
| macOS traffic lights | at (226, 34), in the black under the top arm |

Canon comparison [community, thelcars.com CSS]: a 240px frame has a 160px elbow (outer radius ≈ 0.67 of frame width),
inner radius ≈ 0.375 of outer, 28px bars, 4px gaps. Ours is flatter (outer radius 44 on 210 = 0.21) and keeps the
inner radius larger relative to the outer (26/44 = 0.59). Deliberate: a tall elbow would eat the terminal area.

## 6. Typography

- **Chrome:** Antonio bold (SIL OFL, bundled in the home `fonts/` folder), ALL CAPS. Original on screen was Swiss 911
  Ultra Compressed (commercial); Antonio is the recognised free lookalike. [canon+community]
- **Terminal and code-like text:** JetBrains Mono, original case.
- **Wordmark:** "BRIDGE" in Antonio 26px, top elbow. Deliberately off-canon (brand mark).
- **Sizes today:** space title 30; slab labels 15; secondary 12–13; meta 10–11. Condensed type reads ~11% slower
  (NN/g), so functional labels should be ≥ 12px (see rule 12).
- **Stardate** is `year − 1920` plus a fraction of the year, 7 digits. Canon is 5 digits plus a tenth. Invented either way.

## 7. Components

**Frame.** Top bar (wordmark, machine, stardate, space name), sidebar (SPACES, `+ NEW SPACE`, CREW), bottom bar (MENU, gear,
counts, clock, ⌘⇧P hint). Right-click opens Herdr's own menus (not LCARS-styled).

**Bar.** `BOARD | TERMINALS` (lit = orange, otherwise grey, violet on hover), a separator, one pill per tab (drag to reorder,
double-click to rename, right-click menu, ✕ on the active one, `‹ n` / `n ›` to step when many), `FILES` / `CHANGES` toggles
(lit = orange), window buttons where the OS draws none.

**Panes.** Header: `← BOARD` pill, status dot, program/title in tan caps, status word, short id, then split right, split down, zoom, close.
The 2px rule under the header is orange when the pane has the keyboard, otherwise the status colour.

**Board.** Shows the cards of the **space selected in the sidebar**; selecting another space switches the board. In board view the
bar shows `THIS SPACE | ALL SPACES` (lit = orange) and a card count; `ALL SPACES` lists every agent. The choice is the shared value
`lcars.board.scope` (`"space"` default, or `"all"`). A space with no agents says so and offers `SHOW ALL SPACES`.
Four columns (BLOCKED, WORKING, DONE, IDLE), each a status-coloured slab with the count at left and the name at right
(grey when empty). Cards: black, strip at left, title in tan caps (grey if idle), machine chip, space, terminal id, age.
**Click** shows the agent in the quick terminal below; **double-click or Enter** opens its tab full size. The selected card has an orange border.

**Card names.** Agents rarely set a useful title (most sessions open with "recall project context"), so people name their cards.
The pencil on each card (orange while the card is unnamed) or `rename` in the `…` menu opens an LCARS dialog; the name is stored as
the terminal label `lcars.name`, kept by herdr-core and shared across Herdr screens. Title resolution, first match wins:
1. the human name (`lcars.name`);
2. the agent's own title, unless it matches the `GENERIC` list in `lcars-board/main.js` (recall-project-context variants,
   "Claude Code", terminal ids like `t1d`);
3. the tab's name, if someone named the tab;
4. `UNNAMED` (dimmed), with the pencil lit.

An empty name, or `USE AUTO TITLE` in the dialog, removes the label. A human name always wins over what the agent reports, so a stale
name stays until changed. Titles are tan on black for every status (they were grey on idle/done cards, 3.8:1), wrap to two lines, then cut.
Removing a name from a terminal by hand: `hc label t11 lcars.name=`.

**Keys** (`layout:lcars-bridge`): ⌘⇧B board, ⌘⇧T terminals, ⌘⇧F files, ⌘⇧G changes.

## 8. Motion

| Where | Opacity | Period |
|---|---|---|
| Crew strip, board strip, header dot (blocked) | 0.4 ↔ 1 | 700 ms |
| Tab pill (blocked, inactive) | 0.5 ↔ 1 | 800 ms |
| Space slab (blocked, inactive) | 0.55 ↔ 1 | 900 ms |

All under 3 Hz (WCAG 2.3.1 safe). Hover: 0.85 opacity, or violet on neutral pills. No transitions beyond that.

## 9. Accessibility rules

Checked by `python3 -I tools/check-contrast.py` where marked ✓ (palette numbers). Status: **met**, **partial**, **gap**.

| # | Rule | Status | Evidence |
|---|---|---|---|
| 1 | Text/background pairs ≥ 4.5:1 (≥ 3:1 for large text, borders, strips) | gap: 10 known pairs ✓ | WCAG 1.4.3 / 1.4.11 |
| 2 | Grey slabs and borders `#777799` (4.88 both ways); grey *text* `#8888aa` (6.15 on black) | gap ✓ | [computed] |
| 3 | Never tan text on grey (use black, or white 5.50) | met | [computed] |
| 4 | Status is never colour alone: colour + glyph/fill + word where a word fits | partial (words on crew rows, board, bar counts; pills and strips are colour only) | WCAG 1.4.1; Carbon status pattern |
| 5 | Glyphs: blocked `!`, working dot/chevron, done check, idle hollow ring | gap | [inference] |
| 6 | working (blue) vs idle (violet) must differ by shape/fill (dE 20–26 under colour-vision deficiency) | gap | [computed] |
| 7 | Pulse the strip/glyph only, never text; opacity floor ≥ 0.7 (red is 1.81:1 at 0.4, 3.56:1 at 0.7) | gap ✓ (pill and slab pulses include text) | [computed] |
| 8 | One pulse clock, 700–900 ms (1.1–1.4 Hz) | partial (in range, not phase-shared) | WCAG 2.3.1 |
| 9 | A pulse stops after 5 s and holds a static state | gap | WCAG 2.2.2 |
| 10 | Honour the OS reduce-motion setting | gap | WCAG 2.3.3 practice |
| 11 | Click targets ≥ 24×24, preferably 28+ | partial (pane-header glyph buttons are 20 tall) | WCAG 2.5.8 |
| 12 | Functional labels ≥ 12px bold with 0.04–0.08em tracking; 10–11px only for redundant info | gap (crew second line 11, key hints 10, board meta 11) | NN/g glanceable fonts |
| 13 | ALL CAPS only for chrome labels of ≲ 3 words; paths, hashes, branches, commands, user-authored names in mixed case mono | partial (board ids and spaces in mono; space/tab/agent names are capitalised) | NN/g; [inference] |
| 14 | Truncate: end for names, middle for paths/hashes, full text on hover | partial (end only) | PatternFly, Geist |
| 15 | Overflowing lists end in `+NN MORE`, coloured by the worst hidden status; blocked is never hidden | gap (sidebar clips; ~14 rows fit at 820px) | [inference] |
| 16 | At most four status colours plus orange chrome | met | Carbon |
| 17 | All 16 ANSI slots defined; each ≥ 4.5:1 on black except slot 0; white ≠ yellow (dE ≥ 40) | partial: all 16 defined; slot 8 is the grey (3.82); white `#ffcc99` vs yellow `#ffcc66` is dE 24.8 ✓ | [computed] |
| 18 | Terminal selection `#3a2600` so red/blue text on it reaches 4.5:1 | gap ✓ | [computed] |
| 19 | Terminal minimum-contrast on (Herdr `minimum_contrast` in settings.json, 1 = off) | gap | jvns.ca terminal colours |
| 20 | Counts zero-padded to 2 digits; status words WORKING / NEEDS YOU / DONE / STANDING BY | met (board column header still says BLOCKED) | [inference] |

## 10. Where we depart from canon (on purpose or not)

- **Bordered, rounded panes and cards (radius 10, 2px border).** Canon blocks are flat slabs; outlines are not an LCARS idiom [inference].
  Kept: terminals need a frame and a focus ring.
- **Elbow ratio 0.21** vs ~0.67 in the community reference. Kept for space.
- **BRIDGE wordmark, 7-digit stardate.** Brand and invention.
- **Hex values.** No source gives `#ff9900` or `#666688` as official; there is no official palette. Our palette is the TNG-era family
  (`#cc99cc`, `#9999ff`, `#99ccff`, `#ffcc99`, `#ffcc66` match community values).
- **Gap 4px** is the tightest among implementations that publish sizes (others use 5–7). Fine on a dense native display.
- **Tabs and toggles are pills, panes are boxes.** A mix of LCARS and conventional tool UI. This is the price of hosting real terminals.

## 11. Backlog (ordered by impact; none applied yet)

1. Grey `#666688` → `#777799` for slabs/borders and `#8888aa` for grey text (fixes four failing pairs at once).
2. Redundant status cue: glyph or fill style per state (idle = hollow ring), also fixes blue/violet under colour-vision deficiency.
3. Pulses: strip/glyph only, floor 0.7, stop after 5 s, reduced-motion fallback.
4. ANSI: white `#c8b8a8` (dE 47.5 from yellow), bright black `#8888aa`, selection `#3a2600`; set `minimum_contrast` in settings.json.
5. Sidebar overflow: `+NN MORE` slab coloured by worst hidden status; optional collapsed rail with elbow and strips.
6. Raise 10–11px labels to ≥ 12px; add tracking; mixed-case mono for paths/branches/agent names.
7. Truncation helper (middle mode for paths, full text on hover).
8. One shared token source. Mods can only import files inside their own folder, so a real fix is a small generator
   (`tokens.json` → a `tokens.js` per mod) or accepting four copies and keeping `check-contrast.py` honest.
9. Rename the board `BLOCKED` column to `NEEDS YOU` for consistency (rule 20).

## Sources

Canon and community: thelcars.com (https://www.thelcars.com/colors.php, https://www.thelcars.com/fonts.php),
trekcolors (https://rdrr.io/cran/trekcolors/f/README.md), lambtor LCARSAssets (https://github.com/lambtor/LCARSAssets),
Stardate (https://en.wikipedia.org/wiki/Stardate).
Implementations compared: https://github.com/th3jesta/ha-lcars, https://github.com/thijs-hakkenberg/lcars-design-system,
https://github.com/DarrellBest/modern-lcars, https://github.com/hmt3design/LCARS_CSS_Grid,
https://github.com/Malechus/LCARS_Terminal, https://github.com/willwearing/lcars-agent-monitor,
https://github.com/LioHeimberg/omarchy-lcars-theme. Fan themes without a licence were read for ideas only; no code was copied.
Accessibility: WCAG 2.2 Understanding pages (contrast-minimum, use-of-color, three-flashes-or-below-threshold, pause-stop-hide,
target-size-minimum) at https://www.w3.org/WAI/WCAG22/Understanding/; Carbon status pattern
(https://carbondesignsystem.com/patterns/status-indicator-pattern/); NN/g (https://www.nngroup.com/articles/glanceable-fonts/);
colour-universal design (https://jfly.uni-koeln.de/color/); terminal colours (https://jvns.ca/blog/2024/10/01/terminal-colours/);
truncation (https://www.patternfly.org/components/truncate/design-guidelines, https://vercel.com/geist/middle-truncate).

Limits of the research: Memory Alpha was unreachable, so Okuda's interviews and the Technical Manual were not read directly;
no published accessibility audit of LCARS exists; nothing was found on LCARS sound design or on Discovery/Prodigy/Lower Decks
interface rationale. The raw research notes are not in the repo (they lived in an ignored `tmp/` folder).
