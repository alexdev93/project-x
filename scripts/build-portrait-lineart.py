"""
Animated line-art portrait, generated from the source photograph.

Approach: two different tools for two different jobs.

* The outer silhouette (hair, face, shoulders) comes from the alpha matte this
  project already derives in _matte.py — a smooth scalar field, exactly what
  marching squares (skimage.measure.find_contours) is built for. One clean
  contour, no noise.
* Interior detail (eyes, brows, nose, mouth, beard) comes from Canny edge
  detection, restricted to a face bounding box. Restricting it matters: run
  across the whole frame, the suit's pinstripes and the shirt's print
  contribute hundreds of short, meaningless strokes that have nothing to do
  with his likeness.

Canny gives a 1px-wide boolean edge map, which find_contours cannot trace
directly — it traces the boundary *around* a line, not the line itself, so a
single stroke would come back as two nested contours instead of one. Each
connected component is walked as a graph instead: pick an endpoint, greedily
visit the nearest unvisited neighbour, and the pixels come out in stroke order.

Every path is emitted as viewBox-normalised points; the ordering IS the
animation — see PortraitLineArt.tsx, which draws each one along its own
stroke-dashoffset in sequence.

Writes src/components/portrait/lineart-geometry.ts
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import feature, measure

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from _matte import (  # noqa: E402
    absorb_trapped_pockets,
    backdrop_region,
    build_alpha,
    clean_alpha,
    fit_backdrop,
    load,
    seed_mask,
)

SOURCE = ROOT / "assets" / "portrait-source.jpg"
OUTPUT = ROOT / "src" / "components" / "portrait" / "lineart-geometry.ts"

# Normalised output coordinate system. 4:5 matches the hero's aspect-[4/5]
# panel, so the geometry drops straight into its viewBox with no letterboxing.
VIEW_W, VIEW_H = 320, 400

# Face bounding box, as a fraction of the full frame — where Canny is allowed
# to run. Measured against this photograph: 0.06-0.62 height covers hairline
# to jaw, 0.20-0.80 width covers ear to ear with margin. Outside this box is
# suit and shirt, which is silhouette-only territory.
FACE_BOX = (0.06, 0.62, 0.18, 0.82)  # (top, bottom, left, right), fractions

MIN_COMPONENT_PX = 5      # drop single-pixel noise specks
SIMPLIFY_TOLERANCE = 1.4  # px, in source-image space
MAX_FACE_PATHS = 90       # keeps the draw-in animation legible, not chaotic


def trace_component(coords: np.ndarray) -> np.ndarray:
    """
    Order a connected component's pixels into a walkable stroke.

    coords: (N, 2) array of (row, col). Greedy nearest-neighbour walk starting
    from a degree-1 pixel (a stroke endpoint) when one exists, otherwise from
    an arbitrary point (the component is a loop or a junction).
    """
    n = len(coords)
    remaining = set(range(n))

    # Degree of each pixel within the component: how many of its 8-neighbours
    # are also in the component. A stroke's two ends have degree 1.
    tree_idx = {tuple(c): i for i, c in enumerate(coords)}
    degree = np.zeros(n, dtype=int)
    for i, (r, c) in enumerate(coords):
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                if (r + dr, c + dc) in tree_idx:
                    degree[i] += 1

    start = int(np.argmin(degree)) if n > 1 else 0
    order = [start]
    remaining.discard(start)
    current = coords[start]

    # Nearest-neighbour walk. O(n^2) but components are small (rarely > 200px
    # for a face-region Canny map), so this is fast enough without a KD-tree.
    while remaining:
        rem_arr = coords[list(remaining)]
        d2 = ((rem_arr - current) ** 2).sum(axis=1)
        nearest_local = int(np.argmin(d2))
        nearest_global = list(remaining)[nearest_local]
        order.append(nearest_global)
        remaining.discard(nearest_global)
        current = coords[nearest_global]

    return coords[order]


def polyline_to_path(points: np.ndarray, sw: int, sh: int) -> str:
    """Normalises (row, col) points into the VIEW_W x VIEW_H box and emits an SVG path."""
    xs = points[:, 1] / sw * VIEW_W
    ys = points[:, 0] / sh * VIEW_H
    cmds = [f"M{xs[0]:.1f} {ys[0]:.1f}"]
    cmds += [f"L{x:.1f} {y:.1f}" for x, y in zip(xs[1:], ys[1:])]
    return " ".join(cmds)


def path_length(points: np.ndarray) -> float:
    return float(np.sqrt(((points[1:] - points[:-1]) ** 2).sum(axis=1)).sum())


def build_silhouette(alpha: np.ndarray) -> str:
    """The single outer contour of the subject, from the alpha matte."""
    contours = measure.find_contours(alpha, level=0.5)
    largest = max(contours, key=len)
    simplified = measure.approximate_polygon(largest, tolerance=SIMPLIFY_TOLERANCE)
    h, w = alpha.shape
    return polyline_to_path(simplified, w, h) + " Z"


def build_face_detail(gray: np.ndarray) -> list[str]:
    h, w = gray.shape
    top, bottom, left, right = FACE_BOX
    y0, y1 = int(h * top), int(h * bottom)
    x0, x1 = int(w * left), int(w * right)

    edges = feature.canny(gray[y0:y1, x0:x1], sigma=2.2, low_threshold=0.08, high_threshold=0.18)
    labels, n = ndimage.label(edges, structure=np.ones((3, 3)))

    components = []
    for label_id in range(1, n + 1):
        coords = np.argwhere(labels == label_id)
        if len(coords) < MIN_COMPONENT_PX:
            continue
        ordered = trace_component(coords)
        simplified = measure.approximate_polygon(ordered, tolerance=SIMPLIFY_TOLERANCE)
        if len(simplified) < 2:
            continue
        components.append((path_length(ordered), simplified))

    # Longest strokes carry the likeness (brow lines, eye rims, nose bridge);
    # short ones are mostly texture. Cap rather than filter by length alone,
    # so the count is predictable regardless of how noisy a given photo is.
    components.sort(key=lambda c: c[0], reverse=True)
    kept = components[:MAX_FACE_PATHS]

    paths = []
    for _, simplified in kept:
        # Shift back into full-frame coordinates before normalising, so the
        # face detail lines up with the silhouette from build_silhouette.
        shifted = simplified + np.array([y0, x0])
        paths.append(polyline_to_path(shifted, w, h))
    return paths


def main() -> None:
    rgb = load(SOURCE)
    gray = np.asarray(Image.open(SOURCE).convert("L")).astype(np.float64) / 255.0

    model = fit_backdrop(rgb, seed_mask(rgb))
    alpha = build_alpha(rgb, model)
    backdrop = absorb_trapped_pockets(backdrop_region(rgb, model), alpha)
    alpha = clean_alpha(alpha, backdrop)

    silhouette = build_silhouette(alpha)
    face_paths = build_face_detail(gray)

    # Silhouette first: it draws in as the base shape, then detail resolves
    # inside it, roughly the order a hand-drawn portrait would follow.
    all_paths = [silhouette] + face_paths

    ts = f"""/**
 * Generated by scripts/build-portrait-lineart.py from assets/portrait-source.jpg.
 * Do not hand-edit — re-run the script if the source photo changes.
 */

export const PORTRAIT_VIEW_BOX = "0 0 {VIEW_W} {VIEW_H}";

/** Path 0 is the outer silhouette; the rest are interior facial detail. */
export const PORTRAIT_PATHS: string[] = {json.dumps(all_paths, indent=2)};
"""
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(ts)
    print(f"wrote {OUTPUT.relative_to(ROOT)}")
    print(f"  silhouette: 1 path")
    print(f"  face detail: {len(face_paths)} paths")
    print(f"  total: {len(all_paths)} paths")


if __name__ == "__main__":
    main()
