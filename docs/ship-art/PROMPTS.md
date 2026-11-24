# Ship art prompts

**This repo ships no pictures.** The ship view draws a plain space dock by default. If you want a picture behind it, generate one with
the prompts below and follow [AGENT-SETUP.md](AGENT-SETUP.md). The images the author picked are AI-generated and are not included.

All prompts were run with aspect ratio 16:9.

## The prompts that worked

### agy-1, side cutaway (the favourite)

```text
Star Trek LCARS Master Systems Display (MSD) technical diagram of an original generic Federation starship. Side cross-section cutaway view showing internal decks, saucer section, connecting neck, engineering hull, and dual warp nacelle pylons. Authentic 1990s TNG LCARS graphic style: solid pure black background, flat 2D vector technical line art, no gradients or 3D shading. Palette consisting strictly of LCARS colors: pastel orange, peach, lilac, pale lavender, light sky blue, and amber outlines. Clean technical internal schematics showing deck lines, impulse engines, glowing warp core tube schematic, and nacelle coils. Around the starship, 7 thin leader lines extend outward to blank rounded rectangular pill-shaped callout indicator boxes (empty label slabs) in classic LCARS rounded-end style. Completely blank labels, strictly no readable text, no letters, no numbers, no gibberish text. Minimalist, retro sci-fi computer interface schematic.
```

Produced: a flat LCARS-style cutaway of a ship in side view on pure black, with 8 empty rounded callout pills (the prompt says 7; the model
drew 8) joined by thin leader lines to parts of the ship. The pills are part of the picture, so the mod uses them as hover cards
(`pills` in the `ARTS` entry). Best result by far: clean left/right/bottom pill layout, easy to overlay zones.

### agy-3, isometric wireframe (second best)

```text
Star Trek LCARS 3D isometric wireframe diagnostic display of an original generic Federation starship. Three-quarter elevated isometric angle showing the complete ship in 3D perspective: circular primary saucer section with geometric wireframe mesh, slender neck, cylindrical engineering hull, and two symmetrical outboard warp nacelles on angled pylons glowing blue and orange. Graphic style is authentic TNG LCARS computer UI: pitch black background (#000000), bright neon wireframe vector lines, holographic schematic diagnostic appearance. Palette of glowing peach, pastel orange, lilac, violet, and electric cyan/light blue wireframe mesh grid. Stylized holographic tactical shield bubble contour or concentric diagnostic sensor rings encircling the ship. Minimalist LCARS interface framing tabs at the edges. Strictly no readable text, no letters, no numbers. Retro-futuristic Star Trek computer tactical screen.
```

Produced: an isometric wireframe ship with a shield bubble. It has **no usable pills**: the mod draws them (`drawn: true`) in the margins
beside the parts, so you register `zones` and `pills` yourself.

### agy-2, simple silhouette (rejected)

Not appealing enough, kept only for the record.

```text
Star Trek LCARS Master Systems Display exterior side elevation profile of an original generic Federation starship. Clean minimalist technical side silhouette with elegant LCARS accent lines and outlines. Pitch black background (#000000). The starship silhouette is presented in side view: sleek primary saucer hull, curved connecting neck, engineering secondary hull with a glowing blue circular deflector dish contour, and twin warp nacelles mounted on swept pylons. Flat 2D vector graphic art style in the classic 1990s LCARS Okudagram palette: crisp thin outlines in orange, peach, lilac, lavender, and soft cyan light-blue. Exterior hull panel seams, glowing nacelle warp grille accent strips, and impulse exhaust accent lines. No internal cutaways, no callout text boxes, strictly no readable text, no letters, no numbers. Highly stylish, clean, minimalist science fiction UI diagnostic graphic.
```

## What we learned

- Generated with Google's Antigravity image-generator subagent (a Gemini flash image model) from a one-paragraph brief like the above.
- Other attempts were worse: Codex's image tool made versions that were too detailed (busy interiors, hard to overlay zones); the
  simple silhouette (agy-2) was not appealing enough; having Claude draw the ship as SVG/vector was terrible. Don't.
- "No readable text" matters: image models love to invent gibberish labels, and the mod writes the real labels on top.
- Results vary run to run. Look at 3-4 generations and pick one whose pills sit in a clean left/right/bottom arrangement.

## Recommended / generic variant (no Star Trek or Federation)

For people who prefer to stay clear of the IP, and the one to try first for a new picture. It asks for exactly eight pills, four on each
side, each leader line ending on a different part:

```text
Technical diagram of an original generic starship in a flat LCARS-style retro computer interface style. Side cross-section cutaway view
showing internal decks, a saucer-like primary hull, a connecting neck, an engineering hull, and two engine nacelles on pylons. Solid pure
black background (#000000), flat 2D vector technical line art, no gradients or 3D shading. Palette strictly pastel orange, peach, lilac,
pale lavender, light sky blue and amber outlines. Clean technical internal schematics showing deck lines, engines, a reactor core tube
and nacelle coils. Around the ship, exactly eight thin leader lines extend outward to exactly eight blank rounded rectangular pill-shaped
callout boxes (empty label slabs with rounded ends): four on the left and four on the right, evenly spread, no two lines ending on the
same part. The eight parts, one line each: saucer top, saucer front, saucer underside, engineering hull, reactor / warp core, nacelle
coils / neck, lower aft hull, nose. Completely blank labels, strictly no readable text, no letters, no numbers, no gibberish text.
Minimalist retro sci-fi computer interface schematic. 16:9.
```

The model does not always honour counts. Count the pills you got; the mod auto-places a pill for any zone you leave out of `pills`
(see [AGENT-SETUP.md](AGENT-SETUP.md)). The historical prompts above are kept word for word. This variant has not been run against the original;
expect to adjust it.
