import { describe, expect, it } from "vitest";
import { escapeLittleText } from "./little-text";

/**
 * Regression coverage for a real incident: a caption containing
 * "(Dart + Kotlin)" published fine (a 201, no error) but LinkedIn silently
 * truncated everything from the unescaped "(" onward — the parenthesis
 * started a construct its "little" markup parser couldn't complete. Nothing
 * in the create call's response surfaced that, which is exactly why this
 * needs a test rather than relying on noticing it live again.
 */
describe("escapeLittleText", () => {
  it("escapes a literal parenthesis that previously truncated a real post", () => {
    expect(escapeLittleText("A dual-capture layer (Dart + Kotlin) feeds a parser")).toBe(
      "A dual-capture layer \\(Dart + Kotlin\\) feeds a parser",
    );
  });

  it("escapes every reserved character except a word-starting #", () => {
    expect(escapeLittleText("{a} [b] <c> *d* _e_ ~f~ g|h @i")).toBe(
      "\\{a\\} \\[b\\] \\<c\\> \\*d\\* \\_e\\_ \\~f\\~ g\\|h \\@i",
    );
  });

  it("leaves a real hashtag unescaped so it still renders as a tag", () => {
    expect(escapeLittleText("Shipped it. #buildinpublic")).toBe("Shipped it. #buildinpublic");
  });

  it("escapes a # that isn't starting a word", () => {
    expect(escapeLittleText("C# and F#, priority #!")).toBe(
      "C\\# and F\\#, priority \\#!",
    );
  });

  it("escapes a literal backslash before escaping anything else", () => {
    expect(escapeLittleText("a\\b (c)")).toBe("a\\\\b \\(c\\)");
  });

  it("passes plain prose and a bare URL through unchanged", () => {
    const text = "Read more: https://alemayehu.vercel.app/blog/spendguard";
    expect(escapeLittleText(text)).toBe(text);
  });
});
