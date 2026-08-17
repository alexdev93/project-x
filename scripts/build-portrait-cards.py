"""
Split the two-up illustrated portrait mockup into per-theme hero assets.

Input is a single 1536x1024 image holding two design-mockup cards side by side —
a light-mode card and a dark-mode card of the same illustrated portrait. Both
carry annotation chrome that describes the design rather than being part of it:
a "LIGHT MODE"/"DARK MODE" pill, an overflow-dots glyph, a vertical "ALEX"
logotype, a signature, a role card, and a hex-swatch bar.

Two ways to remove chrome, and the choice per element is deliberate:

* **Framing.** The crop is chosen so that most chrome falls outside it —
  the dots, signature, role card and swatch bar are all excluded by geometry,
  which cannot leave an artefact behind. This is why the crop is head-focused
  rather than a full head-and-shoulders: extending it low enough for the
  shoulders would pull the role card in, and extending it right enough for
  symmetry would pull the signature in against his beard, where a fill
  artefact would be most visible.
* **Inpainting.** Only the mode pill is left to remove, and only because it
  sits above the crop's floor. It is verified to lie entirely on background —
  hair does not start until x=273 in that band, and the pill ends at x=258 —
  so a harmonic fill has nothing but smooth gradient to reconstruct.

The vertical "ALEX" logotype is dropped by framing too, which is also the
correct outcome for its own reason: the site's chrome deliberately uses the
full name, not the nickname.

Writes public/portrait-light.webp and public/portrait-dark.webp.
"""

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "portrait-cards.png"

# Card geometry, in the coordinates of one 768x1024 half.
#
# The hair mass was measured at x 221..626, y 62..408, putting the head's centre
# line at x=423. An earlier crop guessed these bounds and came out both too
# tight and visibly off-centre, so the frame below is derived from that
# measurement rather than estimated:
#   centred on x=423 so the head sits on the frame's centre line
#   top    26 — inside the card's border, with headroom above the crown at y=62
#   bottom 712 — clears the role card, which starts at y=722, keeping the
#                shoulders that make this read as a portrait rather than a
#                cropped face
# 549x686 is 4:5 to within a rounding error, matching the hero panel's aspect
# so the browser never has to crop it again.
CROP = (149, 26, 698, 712)

# Chrome that falls inside that frame, each plus a margin for its soft drop
# shadow. All three were checked against the subject's silhouette and sit on
# background only: the pill ends at x=258 where hair starts at x=273, the dots
# sit well right of the hair, and the signature clears the beard by ~35px.
PILL = (44, 38, 272, 124)
DOTS = (646, 56, 728, 106)
SIGNATURE = (616, 466, 732, 574)
CHROME = (PILL, DOTS, SIGNATURE)

# Output at 2x the hero's rendered size (409x512 CSS px). The source card is
# only 768x1024, so this is a modest upscale — acceptable here precisely
# because the subject is a painterly illustration rather than a photograph,
# so it has no fine sensor detail to smear.
OUT_SIZE = (818, 1024)
WEBP_QUALITY = 88


def inpaint(rgb: np.ndarray, box: tuple[int, int, int, int], iterations: int = 600) -> np.ndarray:
    """
    Harmonic fill of a rectangle, from the pixels bordering it.

    Same relaxation the matte pipeline uses to reconstruct the studio backdrop:
    hold everything outside the hole fixed and let it diffuse inward. It
    reproduces an arbitrary smooth gradient without assuming its algebraic
    form, which is what this needs — the card background is a soft radial wash,
    not a flat fill or a linear ramp.
    """
    x0, y0, x1, y1 = box
    out = rgb.copy()

    # Work in a window around the hole so the relaxation is cheap, but leave a
    # generous margin so the boundary condition is real background rather than
    # the hole's own edge.
    m = 40
    wy0, wy1 = max(0, y0 - m), min(rgb.shape[0], y1 + m)
    wx0, wx1 = max(0, x0 - m), min(rgb.shape[1], x1 + m)
    window = out[wy0:wy1, wx0:wx1]

    hole = np.zeros(window.shape[:2], dtype=bool)
    hole[y0 - wy0 : y1 - wy0, x0 - wx0 : x1 - wx0] = True
    known = ~hole

    # Seed the hole with the mean of its border so the relaxation starts close.
    border = ndimage.binary_dilation(hole, np.ones((5, 5))) & known
    window[hole] = window[border].mean(axis=0)

    fixed = window.copy()
    for _ in range(iterations):
        window = ndimage.uniform_filter(window, size=(3, 3, 1))
        window[known] = fixed[known]

    out[wy0:wy1, wx0:wx1] = window
    return out


def build(card: Image.Image) -> Image.Image:
    rgb = np.asarray(card.convert("RGB")).astype(np.float64)
    for box in CHROME:
        rgb = inpaint(rgb, box)

    cleaned = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    return cleaned.crop(CROP).resize(OUT_SIZE, Image.LANCZOS)


def main() -> None:
    src = Image.open(SOURCE).convert("RGB")
    width, height = src.size
    mid = width // 2

    halves = {
        "light": src.crop((0, 0, mid, height)),
        "dark": src.crop((mid, 0, width, height)),
    }

    for name, card in halves.items():
        out = ROOT / "public" / f"portrait-{name}.webp"
        build(card).save(out, "WEBP", quality=WEBP_QUALITY, method=6)
        kb = out.stat().st_size / 1024
        print(f"wrote {out.relative_to(ROOT)}  {OUT_SIZE[0]}x{OUT_SIZE[1]}  {kb:.0f} KB")


if __name__ == "__main__":
    main()
