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
- The other `.svg` files in the mods (chevrons, close, gear, split, zoom, pencil, arrow, file, folder, filter, sort and window buttons)
  are [Lucide](https://lucide.dev) icons (ISC), as shipped with Herdr; some are lightly redrawn. Lucide's licence:

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

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

## kanhrd

`mods/lcars-bar/`, `mods/lcars-board/` and `mods/lcars-pane/` started as clones of the `kanhrd-bar`, `kanhrd-board` and `kanhrd-pane`
mods of the author's own project [kanhrd](https://github.com/wakaru44/kanhrd) (layout `kanhrd-layout`), by the same author as this
repository, and are released here under the MIT licence of this repository.

## Herdr shipped mods

`mods/lcars-files/` started as a copy of the `files` mod that ships with Herdr (restyled, plus a right-click menu). Its licence is
the Herdr app's. Herdr encourages sharing layouts and mods built from its shipped ones (herdr.dev/layouts, herdr.dev/mods).

## Research

Fan LCARS themes read while researching the design system carry no licence; they were consulted for ideas and no code was
copied. See the Sources list in `DESIGN-SYSTEM.md`.

## Not affiliated

LCARS and Star Trek are trademarks of their owners (Paramount / CBS Studios). This is an independent fan project; "LCARS" only names
the visual style it imitates.
