# Alex — Brand Guidelines

The identity for Alemayehu "Alex" Mekonen — full-stack and DevOps engineer.

---

## 1. Concept

The mark is an **A built from two strokes that never touch**. A crossbar bridges
them, and that bridge is the only thing making the two shapes a letter. Cover
it and the mark falls apart into two separate halves.

That is the whole idea, expressed structurally rather than decoratively:

> **Two independent things, joined by a deliberate connection.**

It reads on two levels, and it has to work on both:

- **Without context** — a precise, geometric A. Technology, engineering,
  restraint. This is what most people will see, and it is sufficient.
- **With context** — the Gemini twins: duality, two entities becoming one,
  connection, communication. Nobody needs to be told; it simply rewards
  noticing.

It is also, quietly, an engineering metaphor: two services and the contract
between them. Remove the interface and you have two things that don't add up
to a system.

## 2. Gemini, handled carefully

Gemini informed the **structure**, not the decoration. There is no ♊ glyph, no
constellation, no stars, no horoscope styling. Traditional Gemini associations
were used as follows:

| Association | How it shows up |
|---|---|
| Duality, the twins | Two strokes, deliberately not touching |
| Two becoming one | The crossbar that resolves them into a letter |
| Connection, communication | The bridge is the load-bearing element |
| Air, intellect | Open counters, generous negative space, no fill |
| Symmetry | The mark is near-symmetrical about its vertical axis |
| Adaptability | Monochrome by design — it adapts to any context |

**On colour:** the brief suggested cool Gemini tones — indigo, electric blue,
lavender. These were deliberately *not* adopted. A cool logo on this warm
editorial palette would read as a mismatch on every page, and a mark that
carries its own colour cannot travel to a future project without a repaint.
Adaptability is the more useful Gemini trait here, so the mark is monochrome
and inherits colour from its surroundings.

## 3. Construction

Drawn on a **64 × 64 grid**. The ink spans 10–54 in both axes, so the mark sits
optically centred with equal margin on all sides.

```
stroke weight   7 units          round caps
left stroke     13.5,50.5 → 26.5,13.5
right stroke    50.5,50.5 → 37.5,13.5
bridge          19.8,34 → 44.2,34
apex gap        11 units centre-to-centre (~5 units of visible air)
```

Two constraints govern the drawing:

- **Stroke weight is matched to the wordmark.** Inter SemiBold's stem is 0.174
  of its cap height; at the mark's 45-unit ink height that is 7.8. It is set to
  7 — diagonals read optically heavier than a vertical stem of equal width, and
  anything thicker starts closing the apex gap.
- **The bridge ends on the diagonals' centrelines,** inset slightly so its round
  caps stay tucked inside the strokes rather than bulging out.

Geometry lives in one place: `scripts/build-brand.py`. It generates both the
SVG files here and `src/components/brand/geometry.ts`, so the assets and the
React component cannot drift apart. **Do not hand-edit the SVGs** — change the
script and re-run it.

## 4. Typography

**Wordmark — Inter SemiBold (600), tracking −1.8%.**

Converted to outlines in the asset files, so they carry no font dependency.

A custom notched A was drawn and rejected: it read as a damaged letter rather
than a design detail, and got worse at small sizes. The mark carries the
concept; the wordmark's job is to be legible and well-set. Not every element
needs to repeat the idea.

**In-product typography**

| Role | Face | Used for |
|---|---|---|
| Display | Instrument Serif | Headlines, page titles |
| Body / UI | Inter | Everything else |
| Technical | JetBrains Mono | Tags, metrics, code, eyebrows |

The logo wordmark is Inter; page headlines are Instrument Serif. That contrast
is intentional — the brand signature is technical, the editorial voice is warm.

## 5. Colour

The mark is **monochrome**. It takes `currentColor` and inherits from context.

| Token | Light | Dark |
|---|---|---|
| Ink (mark colour) | `#1a1714` | `#f5f1ea` |
| Canvas | `#faf8f5` | `#14120f` |
| Surface | `#ffffff` | `#1c1917` |
| Accent | `#a64a24` | `#d97b4f` |

The accent is a **supporting** colour — status dots, links, focus rings. The
mark is not tinted with it by default; a coloured logo is a decision to make per
application, not a default.

Fixed-colour files exist for contexts that cannot inherit — email signatures,
print, third-party profiles: `-light`, `-dark`, `-black`, `-white`.

Every foreground/background pair in the palette is checked to WCAG 2.1 AA.

## 6. Clear space and minimum size

**Clear space:** at least **25% of the mark's height** on all four sides. Nothing
— text, rules, image edges, other logos — enters that zone.

**Minimum sizes:**

| Asset | Minimum | Why |
|---|---|---|
| Lockup | 18px tall (~85px wide) | Below this the wordmark's `e` fills in |
| Icon | 20px | Below this the apex gap closes visually |
| Favicon (`favicon.svg`) | 16px | Heavier stroke, tuned for this size |

Below 20px use `favicon.svg`, not `alex-icon.svg`. The favicon is drawn with a
thicker stroke and a tighter box specifically so the gap and the letter both
survive at 16px.

## 7. Files

| File | Use |
|---|---|
| `alex-logo.svg` | Primary lockup, ink on light |
| `alex-logo-dark.svg` | Lockup on dark backgrounds |
| `alex-logo-light.svg` | Lockup on light backgrounds |
| `alex-logo-black.svg` / `-white.svg` | Single-colour reproduction |
| `alex-logo-stacked.svg` | Mark above wordmark — narrow or square spaces |
| `alex-icon*.svg` | Mark alone |
| `alex-wordmark.svg` / `-dark.svg` | Wordmark alone |
| `favicon.svg` | Browser tab, PWA, app shortcut |
| `favicon-mono.svg` | Favicon without the rounded container |
| `alex-og.png` | 1200×630 social card |
| `alex-logo.png` / `alex-icon.png` | Transparent raster, for tools without SVG |
| `alex-app-icon.png` | 512×512 app/profile icon |

In the codebase, prefer the component over the files:

```tsx
import { AlexLogo } from "@/components/brand/AlexLogo";

<AlexLogo />                              // lockup, inherits colour
<AlexLogo variant="icon" />               // mark only
<AlexLogo variant="wordmark" />           // wordmark only
<AlexLogo animated />                     // plays once on mount
<AlexLogo label="Alex" />                 // standalone: gives it an accessible name
```

## 8. Motion

The animated variant plays **once on mount** and then holds still: the two
strokes drift in from either side and settle, then the bridge draws outward from
the centre to join them. The order is the point — two separate things arrive
first, and the connection is what makes them a letter.

Rules:

- Never loop it. A logo that keeps moving is a spinner.
- Use it once per page at most, on first paint. It is currently the header only.
- `prefers-reduced-motion` renders the finished mark immediately — handled
  inside the component, so callers cannot forget.

## 9. Do

- Let the mark inherit `currentColor`.
- Keep 25% clear space.
- Use the lockup where there is room; the icon where there isn't.
- Use `favicon.svg` at 16–20px.
- Put the mark on flat backgrounds, or on quiet areas of an image.
- Give it an accessible name when it stands alone; hide it when a nearby link
  already names it.

## 10. Don't

- **Don't close the apex.** The gap is the idea, not an artefact.
- **Don't recolour the halves separately.** They are one mark, not two objects.
- **Don't add a gradient, glow, bevel or shadow** to the mark itself.
- **Don't outline, stretch or condense it.** Scale proportionally only.
- **Don't rotate it.** It has one orientation.
- **Don't rebuild the lockup by hand.** Spacing is derived, not eyeballed —
  use the component or the supplied file.
- **Don't set the wordmark in another face**, or in Inter at another weight.
- **Don't place it on a busy photograph** without a solid backing shape.
- **Don't use the mark as a bullet, loading spinner, or repeating pattern.**
- **Don't tint it with the accent by default.**

## 11. Incorrect usage — examples

| What | Why it's wrong |
|---|---|
| A with the strokes joined at the top | Destroys the concept; it becomes a generic A |
| Left stroke ink, right stroke accent | Reads as two logos, not one mark |
| Mark at 12px | Apex gap disappears; use `favicon.svg` |
| Lockup squashed to fit a container | Distorts letterforms; use the stacked lockup |
| Mark with a drop shadow on a card | The identity is flat; depth comes from the layout |
| Wordmark retyped in Inter Bold | Wrong weight and tracking; use the file |
| Mark rotated 45° as a decorative motif | It is a letter, not an ornament |
| Animated logo looping in the corner | Reads as a loading state |

## 12. Reproducing the assets

```bash
pip install fonttools brotli
yarn build                        # emits Inter's woff2 for outline extraction
python3 scripts/build-brand.py    # SVGs + geometry.ts
node scripts/build-brand-png.js   # PNG exports (needs playwright)
```

Both are one-off asset tools, not part of `yarn build`. The committed files are
what ship.
