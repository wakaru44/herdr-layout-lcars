# lcars-ship art slot (optional)

The ship view works with no files here: it draws a plain space dock. To use your own picture:

1. Put `<name>.png` here, and `<name>-light.png` (the same picture keyed onto a cream background) for the light theme.
   Real files, not symlinks: Herdr does not draw images behind symlinks.
2. Add an entry to `ARTS` at the top of `../main.js`:

   ```js
   const ARTS = {
     mine: { label: "MINE", file: "art/mine.png", light: "art/mine-light.png", w: 1376, h: 768,
       zones: { bridge: [300, 285, 180, 60], /* ...one [x, y, w, h] in picture pixels per zone id */ },
       pills: { bridge: [40, 181, 192, 49] /* optional callout boxes, same ids */ } },
   };
   ```

   Zone ids: bridge, science, medbay, engineering, reactor, cargo, hangar, shields.
   Without `pills`, space chips sit inside the zones; with them, each pill shows the zone's label and spaces and opens a card on hover.
3. An `ART:` pill row (PLAIN plus your names) then appears in the view header. The choice is kept in the shared key `lcars.ship.art`.

Only put in art you have the right to share.
