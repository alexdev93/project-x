import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prose } from "@/components/blog/Prose";

/**
 * A project's long-form markdown (problem/approach/architecture/outcome/guide),
 * rendered on the server. Same approach as `PostBody` — same library, same
 * `Prose` typography, zero client JS — with one deliberate difference: `img`
 * is allowed here.
 *
 * ## Hardening
 *
 * Same threat model as `PostBody`: not a hostile author, since only the owner
 * can write project content — a *compromised admin session* is what this
 * should stay inert against.
 *
 *  * **No `rehype-raw`.** Raw HTML in the markdown is escaped and shown as
 *    text. Adding that plugin is the change that would open this up.
 *  * **`urlTransform` left alone.** react-markdown's default strips
 *    `javascript:`, `vbscript:` and unsafe `data:` URLs.
 *  * **`disallowedElements`** blocks what would otherwise execute or embed
 *    something — `script`, `iframe`, `object`, `embed`, `style`.
 *    `unwrapDisallowed` keeps the text visible rather than dropping it.
 *  * **`img` is allowed, unlike the blog.** There is still no upload
 *    pipeline — an image here is always a hotlink to something already
 *    hosted elsewhere (a Shields.io badge, a diagram already on GitHub) — but
 *    a project case study benefits from showing one, and a hot-linked image
 *    carries none of the injection risk the tags above do. It renders
 *    `loading="lazy"` and nothing else special; a broken link just shows the
 *    browser's broken-image icon, same as it would in a plain `<img>`.
 */
const DISALLOWED = ["script", "iframe", "object", "embed", "style"];

export function ProjectMarkdown({ children }: { children: string }) {
  return (
    <Prose>
      <Markdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={DISALLOWED}
        unwrapDisallowed
        components={{
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
          img: ({ alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element -- external hotlink; next/image can't optimize an unconfigured host
            <img
              alt={alt ?? ""}
              loading="lazy"
              className="rounded-[var(--radius)]"
              {...props}
            />
          ),
        }}
      >
        {children}
      </Markdown>
    </Prose>
  );
}
