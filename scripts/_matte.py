"""
Alpha matte for the portrait.

Approach: reconstruct the backdrop, then key on distance from it.

Two earlier attempts failed in instructive ways.
  1. A brightness threshold left a jagged halo round the hair — the soft
     hair/backdrop transition is *also* neutral grey, so a hard cut kept it.
  2. A quadratic surface fit could not express the vignette (95th-percentile
     residual ~14), leaving cloudy patches wherever the fit drifted.

So the backdrop is reconstructed by diffusion instead: hold the pixels known to
be backdrop, and let them relax inward across the subject. That reproduces an
arbitrary smooth gradient rather than assuming its algebraic form.
"""

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def load(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float64)


def seed_mask(rgb):
    """Pixels that are confidently backdrop: bright and chromatically neutral."""
    lum = rgb @ [0.2126, 0.7152, 0.0722]
    chroma = rgb.max(2) - rgb.min(2)
    seed = (lum > 168) & (chroma < 5)

    # The shoulders reach the frame edge along the bottom, so nothing down there
    # can be trusted as backdrop.
    seed[int(rgb.shape[0] * 0.60):, :] = False

    # Erode so pixels straddling the silhouette are not treated as pure backdrop.
    return ndimage.binary_erosion(seed, np.ones((7, 7)))


def fit_backdrop(rgb, seed, scale=8, iterations=600):
    """
    Harmonic interpolation of the backdrop across the subject.

    Runs at reduced resolution: the backdrop is smooth by construction, so the
    detail lost by downsampling is detail it does not have, and the relaxation
    converges in a fraction of the time.
    """
    h, w, _ = rgb.shape
    sh, sw = h // scale, w // scale

    small = np.asarray(
        Image.fromarray(rgb.astype(np.uint8)).resize((sw, sh), Image.BILINEAR)
    ).astype(np.float64)
    smask = (
        np.asarray(
            Image.fromarray((seed * 255).astype(np.uint8)).resize(
                (sw, sh), Image.BILINEAR
            )
        )
        > 200
    )

    if not smask.any():
        raise RuntimeError("No backdrop seed pixels survived downsampling.")

    model = small.copy()
    model[~smask] = small[smask].mean(0)

    for _ in range(iterations):
        model = ndimage.uniform_filter(model, size=(3, 3, 1))
        model[smask] = small[smask]  # re-assert the known values each pass

    up = Image.fromarray(np.clip(model, 0, 255).astype(np.uint8)).resize(
        (w, h), Image.BICUBIC
    )
    return np.asarray(up).astype(np.float64)


def build_alpha(rgb, model, hair_ref=32.0, chroma_lo=38.0, chroma_hi=62.0, feather=0.7):
    """
    Alpha from two complementary cues, combined by taking whichever is stronger.

    Distance from the backdrop alone is not enough: a pixel 30 levels darker
    than the backdrop might be half-covered hair or a fully opaque dark subject,
    and treating both as opaque is what produced a bright band hugging the
    silhouette.

    * Hair and suit are near-neutral, so coverage there is recovered by the
      standard unpremultiply: how far the pixel has travelled from the backdrop
      luminance toward the subject's own dark value.
    * Skin and shirt are bright but chromatic, where the luminance cue would
      under-read; chroma carries them to full opacity instead.
    """
    lum = rgb @ [0.2126, 0.7152, 0.0722]
    model_lum = model @ [0.2126, 0.7152, 0.0722]

    # Coverage for neutral subject matter (hair, suit).
    span = np.maximum(model_lum - hair_ref, 1.0)
    alpha_lum = np.clip((model_lum - lum) / span, 0.0, 1.0)

    # Coverage for strongly chromatic subject matter (skin).
    #
    # The threshold sits high on purpose. JPEG 4:2:0 chroma subsampling rings
    # along the hair/backdrop boundary, giving genuinely neutral backdrop pixels
    # a measured chroma of 15-28 for tens of pixels outwards. A low threshold
    # keys on that ringing and paints a bright halo round the head. Skin reads
    # ~93, comfortably clear of it. The shirt reads ~21 and so is deliberately
    # left to clean_alpha's hole filling, since the suit encloses it.
    chroma = rgb.max(2) - rgb.min(2)
    t = np.clip((chroma - chroma_lo) / (chroma_hi - chroma_lo), 0.0, 1.0)
    alpha_chroma = t * t * (3 - 2 * t)

    alpha = np.clip(np.maximum(alpha_lum, alpha_chroma), 0.0, 1.0)

    img = Image.fromarray((alpha * 255).astype(np.uint8), "L").filter(
        ImageFilter.GaussianBlur(feather)
    )
    return np.asarray(img).astype(np.float64) / 255.0


def backdrop_region(rgb, model, tolerance=30.0):
    """
    The backdrop, found by growing from the top border rather than by threshold.

    No per-pixel cue can rescue the shirt: it is a pale, barely-saturated green
    whose distance from the backdrop (median ~32) overlaps the JPEG ringing
    around the hair (95th percentile ~27). Structure resolves what colour
    cannot — the shirt is walled off from the backdrop by the suit and beard, so
    a fill that starts outside the subject simply never reaches it.

    Seeds are restricted to the top border and the upper side margins. The
    shoulders run off the bottom of the frame, so seeding there would let the
    fill march straight up into the suit.
    """
    h, w, _ = rgb.shape
    lum = rgb @ [0.2126, 0.7152, 0.0722]
    chroma = rgb.max(2) - rgb.min(2)

    # Bright-and-neutral is a direct test for backdrop that does not depend on
    # the fitted model. It matters low in the frame, where the model is
    # extrapolated below the seeded region and its distances drift; relying on
    # distance alone there left the fill unable to reach the wedges of backdrop
    # beside the shoulders, which then survived as bright corners.
    looks_like_backdrop = (lum > 160) & (chroma < 10)
    passable = (np.linalg.norm(rgb - model, axis=2) < tolerance) | looks_like_backdrop

    # Seed from any border pixel that looks like backdrop, rather than from a
    # fixed band. The shoulders meet the border as dark navy, so they cannot
    # seed the fill and let it march up into the suit.
    # Top and sides only. The shirt runs off the bottom edge, so seeding the
    # bottom border hands the fill a route straight up into the chest — the
    # suit blocks every other approach to it.
    border = np.zeros((h, w), dtype=bool)
    border[0, :] = True
    border[:, 0] = border[:, -1] = True
    seeds = border & looks_like_backdrop

    # Repeated dilation constrained to passable pixels is a flood fill.
    filled = ndimage.binary_propagation(seeds, mask=passable)
    return filled


def absorb_trapped_pockets(
    backdrop, alpha, max_distance=40.0, max_area=5000, ceiling=0.2
):
    """
    Recover backdrop that the border fill could not reach.

    A hotspot beside the shoulder sits *brighter* than the modelled backdrop and
    is walled in by the collar, so the fill cannot pass into it and it survives
    as a white notch against a dark canvas. Both alpha cues score it 0, so the
    only question is whether a low-alpha island is genuinely backdrop or a pale
    patch of shirt.

    Distance alone is not enough. The pale parts of the shirt form one large
    connected island that reaches up to the collar, so its *minimum* distance to
    the backdrop is also small — absorbing on proximity alone swallowed 85% of
    the shirt. Size is the discriminator that holds: the trapped pocket is
    ~557px against the shirt island's ~55,500, a fiftyfold gap.
    """
    islands = (~backdrop) & (alpha < ceiling)
    if not islands.any():
        return backdrop

    distance = ndimage.distance_transform_edt(~backdrop)
    labels, n = ndimage.label(islands)
    if n == 0:
        return backdrop

    nearest = ndimage.minimum(distance, labels, range(1, n + 1))
    areas = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    keep = {
        i + 1
        for i, (d, a) in enumerate(zip(nearest, areas))
        if d < max_distance and a < max_area
    }
    if not keep:
        return backdrop

    absorbed = np.isin(labels, list(keep))
    return backdrop | absorbed


def clean_alpha(alpha, backdrop, threshold=0.5):
    """
    Force everything outside the backdrop to full opacity.

    The computed ramp is kept only where the backdrop actually is, which is
    where partial coverage is real. Inside the subject, any dip in alpha is an
    artefact — a pale patch of shirt reading as grey — and would otherwise show
    as a hole punched through the chest.
    """
    subject = ~backdrop
    # Erode so the soft silhouette ramp is not overwritten by the hard fill.
    interior = ndimage.binary_erosion(subject, np.ones((5, 5)))

    out = np.where(interior, 1.0, alpha)

    # Drop specks in the backdrop: dust or noise that cleared the ramp.
    solid = out > threshold
    labels, n = ndimage.label(solid)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
        keep = int(np.argmax(sizes)) + 1
        out = np.where(solid & (labels != keep), 0.0, out)
    return np.clip(out, 0.0, 1.0)


def silhouette_band(alpha, width=3):
    """The narrow ring where the subject meets the backdrop."""
    solid = alpha > 0.5
    return ndimage.binary_dilation(solid, np.ones((width, width))) & ~ndimage.binary_erosion(
        solid, np.ones((width, width))
    )


def decontaminate(rgb, model, alpha, strength=0.85):
    """
    Undo backdrop bleed in the silhouette ring only.

    An edge pixel is a blend of subject and backdrop; composited unchanged onto
    a dark canvas it reads as a pale outline. Restricting this to the silhouette
    matters — applied everywhere, it speckled the patterned shirt, whose fine
    detail was being mistaken for edge.
    """
    a = alpha[..., None]
    solved = (rgb - (1.0 - a) * model) / np.maximum(a, 0.06)
    band = silhouette_band(alpha)[..., None]
    return np.clip(np.where(band, rgb * (1 - strength) + solved * strength, rgb), 0, 255)


def warm_grade(rgb, warmth=0.05, contrast=1.06, lift=0.015):
    """Shift the cool ID-photo white balance toward the site's warm palette."""
    out = rgb / 255.0
    out = np.clip((out - 0.5) * contrast + 0.5, 0, 1)
    out = out * np.array([1.0 + warmth, 1.0 + warmth * 0.2, 1.0 - warmth * 0.9])
    out = out + lift * np.array([1.0, 0.8, 0.55]) * (1 - out)
    return np.clip(out, 0, 1) * 255.0
