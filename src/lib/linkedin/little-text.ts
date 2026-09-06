/**
 * LinkedIn's "little" markup format for the `commentary` field —
 * https://learn.microsoft.com/linkedin/marketing/community-management/shares/little-text-format
 *
 * No `server-only` import here on purpose, unlike the rest of this
 * directory: this is pure text transformation, touches no secrets, and
 * needs to be unit-testable (see share.test.ts) — `server-only` is a
 * Next.js build-time virtual module, not a real package, so importing it
 * anywhere makes that file unresolvable outside Next's own bundler.
 */

/**
 * `\ { } @ [ ] ( ) < > * _ ~ |` each start a mention, hashtag, or escape
 * sequence in LinkedIn's markup. A caption that happens to contain an
 * ordinary parenthesis or bracket — "(Dart + Kotlin)", "notes [draft]" —
 * isn't just misrendered: LinkedIn's parser hits a construct it can't
 * complete and drops everything from that point on, silently truncating the
 * rest of the post. That's what this escapes against, on every caption this
 * app has ever sent.
 *
 * `#word` is left alone on purpose: it's the one reserved construct authors
 * actually want unescaped, since typing a hashtag is meant to produce a real
 * clickable one — matching how LinkedIn's own compose box behaves. Every
 * other reserved character is escaped unconditionally: this app never
 * constructs a deliberate `@mention` or `{hashtag|#|word}` template, so an
 * unescaped one is always a stray character, never markup we actually meant.
 */
export function escapeLittleText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/[{}[\]()<>*_~|@]/g, "\\$&")
    .replace(/#(?!\w)/g, "\\#");
}
