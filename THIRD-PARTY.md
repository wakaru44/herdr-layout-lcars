# Third-party notices

## herdr-layouts (lcars) — MIT

`mods/lcars-frame/` is derived from the `lcars` mod of
https://github.com/jkuepker/herdr-layouts (Shepherdr integration and tab pills removed; wordmark, new bar, board, pane header
and layout added by us; the layout itself is our own composition). The colour palette and the idea of the frame come from there.

```
MIT License

Copyright (c) 2026 Josef Kuepker

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fonts: SIL Open Font License 1.1

Antonio (`fonts/Antonio-Regular.ttf`, `fonts/Antonio-Bold.ttf`) is the UI font, with its licence in `fonts/LICENSE-antonio-OFL.txt`.
JetBrains Mono (the terminal font the layout asks for) is not bundled; install it yourself or change `font` in the layout.

## Icons

- `mods/lcars-frame/icons/{codex,antigravity,kiro}.svg` are glyph-only copies of the agent icons Herdr ships (from LobeHub icons, MIT,
  and the agents' own marks). Trademark rights belong to their owners and are not granted by this repository.
- The other `.svg` files in the mods are small UI glyphs. Some, such as chevrons, close, gear and split, may derive from Lucide
  (ISC, https://lucide.dev) as shipped with Herdr; they are listed in PUBLISH-BLOCKERS.md until their origin is confirmed.

## Herdr shipped mods

`mods/lcars-files/` started as a copy of the `files` mod that ships with Herdr (restyled, plus a right-click menu). Its licence is
the Herdr app's; see PUBLISH-BLOCKERS.md.

## Research

Fan LCARS themes read while researching the design system carry no licence; they were consulted for ideas and no code was
copied. See the Sources list in `DESIGN-SYSTEM.md`.

## Not affiliated

LCARS and Star Trek are trademarks of their owners (Paramount / CBS Studios). This is an independent fan project; "LCARS" only names
the visual style it imitates.
