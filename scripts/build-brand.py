#!/usr/bin/env python3
"""
Generate the Alex brand assets in public/brand/.

    pip install fonttools brotli
    yarn build            # so Inter's woff2 exists under .next/static/media
    python3 scripts/build-brand.py

A one-off asset tool, not part of `yarn build`. The committed SVGs are what the
site and README reference; re-run this only when the geometry below changes.

Why a script rather than hand-written SVG: the wordmark is real Inter SemiBold
outlines, converted to paths so the files carry no font dependency. Deriving
them by hand is not practical, and regenerating beats hand-editing curve data.

The icon geometry is defined once here and mirrored in
src/components/brand/AlexLogo.tsx, which renders it with currentColor.
"""

import glob
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "brand"

# --- Icon geometry -----------------------------------------------------------
# Two strokes that never meet, bridged by the crossbar. On a 64 grid the mark's
# ink spans 10..54 in both axes, so it sits optically centred with equal margin.
#
# The crossbar's endpoints are the exact intersections with the diagonals at
# y=34, inset slightly so its round caps stay tucked inside the strokes.
#
# Stroke weight is matched to Inter SemiBold's stem, which measures 0.174 of the
# cap height. At the mark's 45-unit ink height that is 7.8; 7 is used because
# the diagonals read optically heavier than a vertical stem of the same width,
# and because a thicker stroke starts to close the apex gap.
ICON_VIEWBOX = "0 0 64 64"
ICON_STROKE = 7
ICON_PATHS = [
    "M13.5 50.5 26.5 13.5",   # left stroke
    "M50.5 50.5 37.5 13.5",   # right stroke
    "M19.8 34H44.2",          # the bridge
]

# --- Colours -----------------------------------------------------------------
# The mark is monochrome by design and normally inherits its colour from
# context; these fixed variants exist for places that cannot (email, print,
# third-party profiles).
INK = "#1a1714"       # on light backgrounds
PAPER = "#f5f1ea"     # on dark backgrounds
BLACK = "#000000"
WHITE = "#ffffff"

WORDMARK_TRACKING = -0.018  # slightly tighter than Inter's default fit
CAP = 100.0                 # wordmark design space: cap height = 100 units


def load_inter(weight=600, needed="Alex"):
    """
    next/font emits one woff2 per unicode-range, several of which claim to be
    Inter while covering only part of the alphabet — so select by coverage.
    """
    for path in sorted(glob.glob(str(ROOT / ".next/static/media/*.woff2"))):
        try:
            font = TTFont(path)
        except Exception:
            continue
        if not (font["name"].getDebugName(4) or "").startswith("Inter"):
            continue
        if not all(ord(c) in font.getBestCmap() for c in needed):
            continue
        return instancer.instantiateVariableFont(font, {"wght": weight}, inplace=False)
    raise SystemExit("Inter subset covering 'Alex' not found — run `yarn build` first")


def wordmark():
    """Wordmark outlines with the baseline at y=0 and cap height CAP."""
    font = load_inter()
    cap_units = font["OS/2"].sCapHeight
    scale = CAP / cap_units
    glyphs, hmtx, cmap = font.getGlyphSet(), font["hmtx"], font.getBestCmap()

    parts, pen_x = [], 0.0
    for ch in "Alex":
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.1f}")
        # Flip Y: font space grows upward, SVG grows downward.
        glyphs[name].draw(TransformPen(pen, Transform(scale, 0, 0, -scale, pen_x, 0)))
        if pen.getCommands():
            parts.append(pen.getCommands())
        pen_x += hmtx[name][0] * scale + WORDMARK_TRACKING * CAP
    return " ".join(parts), pen_x - WORDMARK_TRACKING * CAP


def svg(body, view_box, width, height, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" '
        f'width="{width}" height="{height}" role="img" aria-label="{title}">'
        f"{body}</svg>\n"
    )


def icon_body(colour):
    strokes = "".join(f'<path d="{d}"/>' for d in ICON_PATHS)
    return (
        f'<g fill="none" stroke="{colour}" stroke-width="{ICON_STROKE}" '
        f'stroke-linecap="round">{strokes}</g>'
    )


def write(name, content):
    (OUT / name).write_text(content, encoding="utf-8")
    print(f"  {name:<26} {len(content):>6} B")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    word_d, word_w = wordmark()
    print(f"wordmark advance: {word_w:.1f} units (cap {CAP:.0f})")

    # --- icon ---------------------------------------------------------------
    for suffix, colour in [
        ("", INK), ("-light", INK), ("-dark", PAPER),
        ("-black", BLACK), ("-white", WHITE),
    ]:
        write(
            f"alex-icon{suffix}.svg",
            svg(icon_body(colour), ICON_VIEWBOX, 64, 64, "Alex"),
        )

    # --- wordmark -----------------------------------------------------------
    wm_view = f"0 -{CAP:.0f} {word_w:.1f} {CAP:.0f}"
    for suffix, colour in [("", INK), ("-dark", PAPER)]:
        write(
            f"alex-wordmark{suffix}.svg",
            svg(
                f'<path fill="{colour}" d="{word_d}"/>',
                wm_view, round(word_w * 0.4), round(CAP * 0.4), "Alex",
            ),
        )

    # --- lockup -------------------------------------------------------------
    # The icon's ink is 44/64 of its box, so scaling the box to CAP*64/44 makes
    # the mark's height match the wordmark's cap height exactly.
    box = CAP * 64 / 45  # ink is 45 of the 64 box; match it to the wordmark cap
    gap = CAP * 0.42
    total_w = box + gap + word_w

    for suffix, colour in [
        ("", INK), ("-light", INK), ("-dark", PAPER),
        ("-black", BLACK), ("-white", WHITE),
    ]:
        body = (
            f'<g transform="translate(0 {-CAP}) scale({box / 64:.5f})">'
            f"{icon_body(colour)}</g>"
            f'<g transform="translate({box + gap:.1f} 0)">'
            f'<path fill="{colour}" d="{word_d}"/></g>'
        )
        write(
            f"alex-logo{suffix}.svg",
            svg(
                body, f"0 -{CAP:.0f} {total_w:.1f} {CAP:.0f}",
                round(total_w * 0.4), round(CAP * 0.4), "Alex",
            ),
        )

    # --- stacked ------------------------------------------------------------
    stack_gap = CAP * 0.36
    stack_h = box + stack_gap + CAP
    body = (
        f'<g transform="translate({(word_w - box) / 2:.1f} 0) scale({box / 64:.5f})">'
        f"{icon_body(INK)}</g>"
        f'<g transform="translate(0 {box + stack_gap + CAP:.1f})">'
        f'<path fill="{INK}" d="{word_d}"/></g>'
    )
    write(
        "alex-logo-stacked.svg",
        svg(body, f"0 0 {word_w:.1f} {stack_h:.1f}",
            round(word_w * 0.4), round(stack_h * 0.4), "Alex"),
    )

    # --- favicon ------------------------------------------------------------
    # Heavier stroke and a tighter box: at 16px the default weight thins out and
    # the apex gap closes up. This keeps both readable.
    fav = (
        '<g fill="none" stroke="{c}" stroke-width="7" stroke-linecap="round">'
        '<path d="M14 50 27 15"/><path d="M50 50 37 15"/><path d="M20 34H44"/></g>'
    )
    write("favicon.svg", svg(
        f'<rect width="64" height="64" rx="14" fill="{INK}"/>' + fav.format(c=PAPER),
        ICON_VIEWBOX, 64, 64, "Alex",
    ))
    write("favicon-mono.svg", svg(fav.format(c=INK), ICON_VIEWBOX, 64, 64, "Alex"))

    # --- shared geometry for the React component ----------------------------
    # Emitted rather than duplicated by hand, so the component and the static
    # assets cannot drift apart.
    ts = ROOT / "src" / "components" / "brand" / "geometry.ts"
    ts.parent.mkdir(parents=True, exist_ok=True)
    paths_literal = ",\n  ".join(f'"{d}"' for d in ICON_PATHS)
    ts.write_text(
        "// Generated by scripts/build-brand.py — do not edit by hand.\n"
        "// Re-run that script to change the mark; it also rewrites public/brand.\n\n"
        f'export const ICON_VIEW_BOX = "{ICON_VIEWBOX}";\n'
        f"export const ICON_STROKE = {ICON_STROKE};\n\n"
        "/** Left stroke, right stroke, then the bridge that makes them a letter. */\n"
        f"export const ICON_PATHS = [\n  {paths_literal},\n] as const;\n\n"
        "/** Wordmark outlines: baseline at y=0, cap height 100, growing down. */\n"
        f'export const WORDMARK_PATH =\n  "{word_d}";\n\n'
        f"export const WORDMARK_WIDTH = {word_w:.1f};\n"
        f"export const WORDMARK_CAP = {CAP:.0f};\n\n"
        "/** The mark's ink fills 45 of its 64-unit box; used to align lockups. */\n"
        "export const ICON_INK_RATIO = 45 / 64;\n",
        encoding="utf-8",
    )
    print(f"  {'geometry.ts':<26} {ts.stat().st_size:>6} B  (src/components/brand)")

    print(f"\nwrote {len(list(OUT.glob('*.svg')))} SVGs to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
