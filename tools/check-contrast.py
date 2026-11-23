#!/usr/bin/env python3
"""Contrast check for the lcars-bridge palette (see DESIGN-SYSTEM.md, "Accessibility rules").

Run:  python3 -I tools/check-contrast.py
Prints every checked pair. Exit status 1 only for a NEW failure; pairs in KNOWN are documented gaps
(listed in DESIGN-SYSTEM.md "Backlog") and print as KNOWN. Fix a gap, then remove it from KNOWN.
The palette below mirrors the constants in the mods and layouts/lcars-bridge.json: keep them in step.
"""
import math
import sys

P = dict(black="#000000", orange="#ff9900", peach="#ff9966", gold="#ffcc66", tan="#ffcc99", lilac="#cc99cc",
         violet="#9999ff", blue="#99ccff", sky="#5599ff", red="#ff5544", grey="#666688",
         raised="#14141f", popover="#0a0a12", selection="#5a3a00")
ANSI = ["#000000", "#ff5544", "#99cc66", "#ffcc66", "#5599ff", "#cc99cc", "#99ccff", "#ffcc99",
        "#666688", "#ff7766", "#bbdd88", "#ffdd88", "#99bbff", "#ddaadd", "#bbddff", "#ffffff"]


def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def lum(h):
    r, g, b = (lin(v) for v in rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def lab(h):
    r, g, b = (lin(v) for v in rgb(h))
    x, y, z = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, \
              (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))


def delta_e(a, b):
    return math.dist(lab(a), lab(b))


# (id, foreground, background, minimum ratio, what)
PAIRS = [(f"black-on-{n}", P["black"], P[n], 4.5, f"black label on {n} slab")
         for n in ("orange", "peach", "gold", "tan", "lilac", "violet", "blue", "sky", "red", "grey")]
PAIRS += [
    ("tan-on-black", P["tan"], P["black"], 4.5, "terminal / body text"),
    ("grey-on-black", P["grey"], P["black"], 4.5, "dim text on black"),
    ("grey-on-raised", P["grey"], P["raised"], 4.5, "dim text on raised surface"),
    ("grey-on-popover", P["grey"], P["popover"], 4.5, "dim text on popover"),
    ("tan-on-grey", P["tan"], P["grey"], 4.5, "tan text on a grey slab (never do this)"),
    ("grey-border", P["grey"], P["black"], 3.0, "2px pane/card border (non-text)"),
    ("orange-focus", P["orange"], P["black"], 3.0, "2px focus border (non-text)"),
    ("red-on-selection", P["red"], P["selection"], 4.5, "red text on terminal selection"),
    ("blue-on-selection", P["sky"], P["selection"], 4.5, "ANSI blue on terminal selection"),
]
PAIRS += [(f"ansi{i}-on-black", c, P["black"], 4.5, f"ANSI slot {i}") for i, c in enumerate(ANSI) if i != 0]
# strips and pill fills are non-text: 3:1
PAIRS += [(f"status-{n}", P[c], P["black"], 3.0, f"{n} strip on black")
          for n, c in (("working", "blue"), ("blocked", "red"), ("done", "gold"), ("idle", "violet"))]
# red at the pulse floor (rule: opacity floor 0.7)
def at_opacity(fg, a):
    return "#%02x%02x%02x" % tuple(round(v * a) for v in rgb(fg))
PAIRS += [("pulse-floor-red", at_opacity(P["red"], 0.4), P["black"], 3.0, "red strip at the current 0.4 pulse floor")]

KNOWN = {"black-on-grey", "grey-on-black", "grey-on-raised", "grey-on-popover", "tan-on-grey",
         "red-on-selection", "blue-on-selection", "ansi8-on-black", "pulse-floor-red"}

bad = 0
for pid, fg, bg, need, what in PAIRS:
    r = ratio(fg, bg)
    ok = r >= need
    tag = "ok   " if ok else ("KNOWN" if pid in KNOWN else "FAIL ")
    if not ok and pid not in KNOWN:
        bad += 1
    if ok and pid in KNOWN:
        tag = "FIXED"  # remove it from KNOWN
    print(f"{tag} {r:5.2f}:1 (need {need})  {pid:18} {what}")

# distinctness rules
de = delta_e(ANSI[3], ANSI[7])
tag = "ok   " if de >= 40 else "KNOWN"
print(f"{tag} dE {de:4.1f} (need 40)    ansi7-vs-ansi3     ANSI white vs yellow must be distinguishable")
sys.exit(1 if bad else 0)
