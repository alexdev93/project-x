#!/usr/bin/env python3
"""
Turn the studio portrait into a theme-agnostic cutout for the site.

    pip install pillow numpy scipy
    python3 scripts/build-portrait.py

Reads  assets/portrait-source.jpg
Writes public/portrait.webp

This is a one-off asset tool, not part of `yarn build`. Re-run it only when the
source photograph changes; the committed .webp is what the site actually loads.

Why it exists
-------------
The source is an ID-style photo on a bright cool-grey backdrop. Against the
site's warm canvas that backdrop clashes in light mode, and in dark mode it is a
glaring white rectangle. Removing it entirely lets the portrait sit on whichever
surface the theme provides, so one asset serves both modes.

See scripts/_matte.py for how the matte is derived and which approaches failed.
"""

from pathlib import Path

import numpy as np
from PIL import Image

from _matte import (
    absorb_trapped_pockets,
    backdrop_like,
    backdrop_region,
    build_alpha,
    clean_alpha,
    decontaminate,
    fit_backdrop,
    load,
    seed_mask,
    warm_grade,
)

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "portrait-source.jpg"
OUTPUT = ROOT / "public" / "portrait.webp"

# Transparent padding. The crown sits close to the top of the source frame,
# which reads cramped once the backdrop is gone. No padding at the bottom: the
# shoulders are meant to run off the edge.
PAD_TOP = 0.10
PAD_SIDE = 0.05

TARGET_WIDTH = 1000
# 38 dB PSNR over the subject with no measurable alpha error, at roughly the
# same file size as the original JPEG.
WEBP_QUALITY = 86


def main() -> None:
    rgb = load(SOURCE)

    model = fit_backdrop(rgb, seed_mask(rgb))
    alpha = build_alpha(rgb, model)
    backdrop = absorb_trapped_pockets(backdrop_region(rgb, model), alpha)
    # Gaps between locks of hair hold visible backdrop the border fill can never
    # reach; without this they are filled to full opacity and read as grey hair.
    alpha = clean_alpha(alpha, backdrop, preserve=backdrop_like(rgb))

    colour = warm_grade(decontaminate(rgb, model, alpha))

    h, w = alpha.shape
    cutout = Image.fromarray(
        np.dstack([colour, alpha * 255]).astype(np.uint8), "RGBA"
    )

    pad_top, pad_side = int(h * PAD_TOP), int(w * PAD_SIDE)
    canvas = Image.new("RGBA", (w + 2 * pad_side, h + pad_top), (0, 0, 0, 0))
    canvas.paste(cutout, (pad_side, pad_top))

    height = round(canvas.height * TARGET_WIDTH / canvas.width)
    canvas = canvas.resize((TARGET_WIDTH, height), Image.LANCZOS)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT, "WEBP", quality=WEBP_QUALITY, method=6)

    print(f"wrote {OUTPUT.relative_to(ROOT)}  {canvas.size[0]}x{canvas.size[1]}"
          f"  {OUTPUT.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
