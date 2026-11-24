#!/usr/bin/env python3
"""Make the light-mode variant of ship art drawn on black.

Luminance-keys the black away (alpha = max(r,g,b)/255), un-premultiplies the colour, darkens and saturates a little so thin
strokes read on cream, then composites over the light background. Needs Pillow.

  python3 tools/make-light-art.py --in mods/lcars-ship/art/mine.png --out mods/lcars-ship/art/mine-light.png [--bg '#fdf6e3']
"""
import argparse
from PIL import Image, ImageEnhance

p = argparse.ArgumentParser()
p.add_argument("--in", dest="src", required=True)
p.add_argument("--out", required=True)
p.add_argument("--bg", default="#fdf6e3")
p.add_argument("--dark", type=float, default=0.78, help="colour multiplier (darken)")
p.add_argument("--sat", type=float, default=1.15, help="saturation boost")
a = p.parse_args()

im = Image.open(a.src).convert("RGB")
px = im.load()
w, h = im.size
alpha = Image.new("L", (w, h))
col = Image.new("RGB", (w, h))
ap, cp = alpha.load(), col.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        m = max(r, g, b)
        ap[x, y] = m
        if m:
            k = 255 / m  # un-premultiply: c / alpha, clamped
            cp[x, y] = (min(255, round(r * k)), min(255, round(g * k)), min(255, round(b * k)))
col = ImageEnhance.Color(col).enhance(a.sat)
col = col.point(lambda v: min(255, round(v * a.dark)))
bg = Image.new("RGB", (w, h), a.bg)
bg.paste(col, (0, 0), alpha)  # alpha composite: colour * alpha + bg * (1 - alpha)
bg.save(a.out)
print(f"wrote {a.out} ({w}x{h})")
