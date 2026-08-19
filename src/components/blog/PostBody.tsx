import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prose } from "./Prose";

/**
 * A post's markdown, rendered on the server.
 *
 * **No `"use client"`, and that is the whole trick.** `react-markdown` carries no
 * client directive of its own — the 207 kB that made the chat renderer worth
 * lazy-loading comes from *that file's* `"use client"`, which it needs for a copy
 * button. Rendered in a server component the same library ships **zero** bytes of
 * JavaScript: the reader receives HTML.
 *
 * Not shared with src/components/chat/Markdown.tsx on purpose. That one remaps
 * h1 and h2 to h3, which is right inside a chat bubble and wrong in an article
 * whose own title is the h1. Two renderers, two jobs, one dependency.
 *
 * ## Hardening
 *
 * The threat model is not a hostile author — the only person who can write a post
 * is the owner. It is a *compromised admin session*, and that is exactly when the
 * renderer should be inert. Everything below is a default left in place or an
 * explicit refusal, nothing clever:
 *
 *  * **No `rehype-raw`.** Raw HTML in the markdown is escaped and shown as text.
 *    Adding that plugin is the single change that would open this up, so it is
 *    worth recognising by name in a future diff.
 *  * **`urlTransform` left alone.** react-markdown's default strips
 *    `javascript:`, `vbscript:` and unsafe `data:` URLs. Overriding it to "fix"
 *    a link would remove that.
 *  * **`disallowedElements`** covers the tags that would otherwise execute or
 *    load something. `img` is in the list on product grounds too — there are no
 *    image uploads — which makes the security decision and the product decision
 *    the same line.
 *  * `unwrapDisallowed` keeps the text inside a disallowed element rather than
 *    dropping it silently, so a mistake in a draft is visible instead of
 *    invisible.
 */

/**
 * `style` would let a stylesheet in; `script`, `iframe` and `object` execute or
 * embed; `img` is excluded because this blog has no image pipeline.
 */
const DISALLOWED = ["script", "iframe", "object", "embed", "style", "img"];

export function PostBody({ children }: { children: string }) {
  return (
    <Prose>
      <Markdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={DISALLOWED}
        unwrapDisallowed
        components={{
          // External links open in a new tab and disown the opener. Internal
          // ones are left alone so client-side navigation still applies.
          a: ({ href, children: text, ...props }) => {
            const external = Boolean(href && /^https?:\/\//i.test(href));
            return (
              <a
                href={href}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                {...props}
              >
                {text}
              </a>
            );
          },
        }}
      >
        {children}
      </Markdown>
    </Prose>
  );
}
