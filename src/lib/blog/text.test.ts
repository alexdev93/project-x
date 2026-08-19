import { describe, expect, it } from "vitest";
import {
  SLUG_PATTERN,
  countLinks,
  excerpt,
  readingMinutes,
  slugify,
  toPlainText,
} from "./text";

describe("slugify", () => {
  it("produces a kebab-case slug", () => {
    expect(slugify("Counting likes without a transaction")).toBe(
      "counting-likes-without-a-transaction",
    );
  });

  it("always satisfies the slug pattern the content schema enforces", () => {
    const titles = [
      "Hello, World!",
      "  spaced   out  ",
      "Café — naïve façade",
      "C++ vs Rust: a comparison (2026)",
      "already-kebab-case",
      "UPPER CASE TITLE",
      "trailing punctuation???",
      "multiple---hyphens",
      "it's a post about don't",
    ];

    for (const title of titles) {
      const slug = slugify(title);
      expect(slug, title).toMatch(SLUG_PATTERN);
    }
  });

  it("strips accents rather than transliterating them", () => {
    expect(slugify("Café naïve")).toBe("cafe-naive");
  });

  it("drops apostrophes instead of turning them into hyphens", () => {
    expect(slugify("it's fine")).toBe("its-fine");
  });

  it("returns an empty string when nothing survives, rather than a mangled slug", () => {
    // The caller treats this as "ask the author for a slug".
    expect(slugify("???")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("ጤና ይስጥልኝ")).toBe("");
  });

  it("truncates long titles without leaving a trailing hyphen", () => {
    const slug = slugify(`${"word ".repeat(40)}end`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toMatch(SLUG_PATTERN);
  });
});

describe("toPlainText", () => {
  it("removes fenced code entirely", () => {
    const text = toPlainText("Before\n\n```sql\nSELECT 1;\n```\n\nAfter");
    expect(text).toBe("Before After");
    expect(text).not.toContain("SELECT");
  });

  it("unwraps inline code, links and emphasis but keeps the words", () => {
    expect(toPlainText("Use `count(*)` in [Postgres](https://example.test)")).toBe(
      "Use count(*) in Postgres",
    );
    expect(toPlainText("**bold** and _italic_")).toBe("bold and italic");
  });

  it("leaves an unpaired marker alone, because it is punctuation", () => {
    // Regression: a blanket [*_~] strip turned count(*) into count().
    expect(toPlainText("`count(*)` and 2 * 3 and snake_case_name")).toBe(
      "count(*) and 2 * 3 and snake_case_name",
    );
  });

  it("drops images, including their alt text's brackets", () => {
    expect(toPlainText("see ![a diagram](/x.png) here")).toBe("see here");
  });

  it("strips heading, quote and list markers", () => {
    expect(toPlainText("## Heading\n\n> quoted\n\n- one\n- two\n\n1. first")).toBe(
      "Heading quoted one two first",
    );
  });
});

describe("excerpt", () => {
  it("returns short text unchanged", () => {
    expect(excerpt("A short thought.")).toBe("A short thought.");
  });

  it("prefers a sentence boundary near the end of the budget", () => {
    const body = `${"x".repeat(150)}. ${"y".repeat(100)}`;
    const result = excerpt(body, 200);
    expect(result.endsWith(".")).toBe(true);
    expect(result).not.toContain("y");
  });

  it("falls back to a word boundary with an ellipsis", () => {
    const body = `${"word ".repeat(80)}`;
    const result = excerpt(body, 60);
    expect(result.endsWith("…")).toBe(true);
    // Never mid-word, which reads as a rendering bug.
    expect(result).not.toMatch(/wor…$/);
  });

  it("never exceeds the budget by more than the ellipsis", () => {
    const result = excerpt("lorem ipsum ".repeat(100), 120);
    expect(result.length).toBeLessThanOrEqual(121);
  });
});

describe("readingMinutes", () => {
  it("floors at one minute", () => {
    expect(readingMinutes("two words")).toBe(1);
    expect(readingMinutes("")).toBe(1);
  });

  it("counts roughly 200 words per minute", () => {
    expect(readingMinutes("word ".repeat(600))).toBe(3);
  });

  it("ignores code blocks, which are not reading time in the usual sense", () => {
    const withCode = `word ${"```\n" + "line\n".repeat(500) + "```"}`;
    expect(readingMinutes(withCode)).toBe(1);
  });
});

describe("countLinks", () => {
  it("counts full URLs and bare hosts", () => {
    expect(countLinks("see https://example.test and www.other.test")).toBe(2);
    expect(countLinks("cheap deals at spam.xyz now")).toBe(1);
  });

  it("returns zero for ordinary prose", () => {
    expect(countLinks("No links here. Just a sentence, e.g. this one.")).toBe(0);
  });
});
