import { describe, expect, it } from "vitest";
import { SOURCES_SENTINEL, parseSources } from "./types";

const sources = [{ title: "Zemenawi CRM", type: "project" as const, url: "/projects/z" }];
const tail = `${SOURCES_SENTINEL}${JSON.stringify({ sources })}`;

describe("parseSources", () => {
  it("splits answer text from the citation tail", () => {
    const result = parseSources(`Alex works in Java.${tail}`);
    expect(result.text).toBe("Alex works in Java.");
    expect(result.sources).toEqual(sources);
  });

  it("returns the whole body when there is no tail", () => {
    expect(parseSources("just an answer")).toEqual({
      text: "just an answer",
      sources: [],
    });
  });

  it("keeps the answer when the tail is truncated mid-stream", () => {
    // The client parses on every chunk, so a half-arrived tail is normal. The
    // text the user is already reading must survive it.
    const partial = `Alex works in Java.${SOURCES_SENTINEL}{"sour`;
    const result = parseSources(partial);
    expect(result.text).toBe("Alex works in Java.");
    expect(result.sources).toEqual([]);
  });

  it("hides the sentinel from the rendered text as soon as it appears", () => {
    const result = parseSources(`Answer.${SOURCES_SENTINEL}`);
    expect(result.text).toBe("Answer.");
    expect(result.text).not.toContain("__SOURCES__");
  });

  it("tolerates a malformed payload without losing the answer", () => {
    const result = parseSources(`Answer.${SOURCES_SENTINEL}not json`);
    expect(result.text).toBe("Answer.");
    expect(result.sources).toEqual([]);
  });

  it("ignores a payload whose sources are not an array", () => {
    const result = parseSources(
      `Answer.${SOURCES_SENTINEL}${JSON.stringify({ sources: "nope" })}`,
    );
    expect(result.sources).toEqual([]);
  });

  it("uses the last sentinel when the answer itself mentions one", () => {
    const body = `I saw ${SOURCES_SENTINEL} in a log.${tail}`;
    expect(parseSources(body).sources).toEqual(sources);
  });
});
