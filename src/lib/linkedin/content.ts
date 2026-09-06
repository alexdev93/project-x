import "server-only";

import type { LinkedInPostState } from "@/lib/db/posts";
import type { LinkedInPostContent } from "./share";
import { absoluteUrl } from "@/lib/site";

/**
 * The one place that decides how a post is represented on LinkedIn, built
 * from the same state every create, edit-sync and relink call reads — so a
 * gallery, a document, or a plain link all resolve the same way regardless
 * of which route triggered the share.
 *
 * A photo or a document takes over the post's content, since LinkedIn allows
 * only one content type per post — and, critically, that content type is a
 * *real* LinkedIn photo/gallery/document post, not a link-preview card with
 * a thumbnail: LinkedIn's article and media content types are mutually
 * exclusive, and a thumbnail bolted onto a link card reads nothing like an
 * ordinary LinkedIn photo post. So the URL back to this site moves into the
 * commentary text instead, which LinkedIn auto-links — exactly like a
 * document share already worked. Only a post with neither a photo nor a
 * document falls back to a plain article link preview.
 */
export function buildLinkedInContent(state: LinkedInPostState): {
  content: LinkedInPostContent;
  commentary: string;
} {
  const title = state.title || state.slug;
  const caption = state.commentary?.trim() || title;
  const url = absoluteUrl(`/blog/${state.slug}`);
  // Labeled, not a bare URL on its own line — matches how an author writing
  // their own caption already links things ("Read more: <url>"), so the one
  // link this app adds automatically doesn't stand out as the odd one out.
  const withLink = `${caption}\n\nFull post: ${url}`;

  if (state.documentUrn) {
    return {
      content: { type: "media", urn: state.documentUrn, title },
      commentary: withLink,
    };
  }

  const images = state.coverImageLinkedInUrn
    ? [{ urn: state.coverImageLinkedInUrn, altText: title }, ...state.extraImages]
    : [];

  if (images.length === 1) {
    return {
      content: { type: "media", urn: images[0].urn, altText: images[0].altText },
      commentary: withLink,
    };
  }

  if (images.length >= 2) {
    return {
      content: { type: "multiImage", images },
      commentary: withLink,
    };
  }

  return {
    content: { type: "article", url, title, description: state.excerpt || undefined },
    commentary: caption,
  };
}
