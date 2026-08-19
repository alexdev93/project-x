/**
 * Turning a post's prose into the small derived strings around it: a slug, an
 * excerpt, a reading time.
 *
 * All pure, all synchronous, no imports. That is what lets the interesting cases
 * — a title that is entirely punctuation, a body that is one long code fence —
 * be tested exhaustively instead of hopefully.
 */

/** The same rule src/content/schema.ts enforces for project slugs. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A kebab-case slug derived from a title.
 *
 * Accents are decomposed and stripped rather than transliterated, so "Café"
 * becomes "cafe". A title with no Latin characters at all — an Amharic heading,
 * for instance — reduces to nothing, and the caller must supply the slug itself;
 * returning a mangled or empty slug silently would produce a URL nobody can
 * reach. `slugify` returns an empty string in that case, and callers treat that
 * as "ask the author".
 */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    // Combining diacritical marks, left behind by the NFKD decomposition.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    // A trailing hyphen can reappear after the slice.
    .replace(/-+$/g, "");
}

/**
 * Markdown reduced to the plain prose inside it.
 *
 * Used for excerpts and for counting words, which is why it removes code fences
 * entirely rather than keeping their contents: a 400-line snippet is not reading
 * time in the sense a reader means, and it makes a terrible excerpt.
 */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    // Images before links: an image's syntax contains a link's.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // Emphasis is unwrapped only where the markers are *paired*. Stripping every
    // asterisk was the first attempt, and it turned `count(*)` into `count()` —
    // a lone marker is punctuation, not formatting.
    .replace(/(\*\*|__|~~)(.+?)\1/g, "$2")
    .replace(/(?<!\w)([*_])(\S(?:[^*_]*\S)?)\1(?!\w)/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A one-or-two-sentence teaser.
 *
 * Cuts on a word boundary and appends an ellipsis, because a truncation
 * mid-word reads as a rendering bug. Prefers to end at a sentence break when one
 * falls in the last third of the budget, which usually produces a teaser that
 * reads as a whole thought rather than a fragment.
 */
export function excerpt(markdown: string, limit = 200): string {
  const text = toPlainText(markdown);
  if (text.length <= limit) return text;

  const window = text.slice(0, limit + 1);

  const sentenceEnd = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  if (sentenceEnd > limit * 0.66) return window.slice(0, sentenceEnd + 1);

  const wordEnd = window.lastIndexOf(" ");
  return `${window.slice(0, wordEnd > 0 ? wordEnd : limit).trimEnd()}…`;
}

/**
 * Reading time in whole minutes, floored at one.
 *
 * 200 words per minute is the conventional figure for prose on screen. Zero
 * minutes would be the honest answer for a two-word post and a useless thing to
 * print, so the floor is 1.
 */
export function readingMinutes(markdown: string): number {
  const words = toPlainText(markdown).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * How many URLs a comment contains, for the spam heuristic.
 *
 * Counts bare hosts as well as full URLs, since "check example.com/deals" is the
 * shape spam actually takes. Deliberately generous: a false positive holds a
 * comment for approval, it does not reject it.
 */
export function countLinks(text: string): number {
  const matches = text.match(
    /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|ru|xyz|top|shop|info|biz|co)\b/gi,
  );
  return matches?.length ?? 0;
}
