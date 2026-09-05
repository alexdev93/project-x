import "server-only";

import type { LinkedInPostState } from "@/lib/db/posts";
import type { LinkedInPostContent } from "./share";
import { absoluteUrl } from "@/lib/site";

/**
 * The one place that decides how a post is represented on LinkedIn, built
 * from the same state every create, edit-sync and relink call reads — so an
 * image, a document, or a plain link all resolve the same way regardless of
 * which route triggered the share.
 *
 * A document takes over the post's content, since LinkedIn allows only one
 * content type per post, so the URL back to this site moves into the
 * commentary text instead, which LinkedIn auto-links. Everything else shares
 * as an article: the post's own URL, with its cover image (if any) as the
 * card's thumbnail. Either way the share always points back at this exact
 * post.
 */
export function buildLinkedInContent(state: LinkedInPostState): {
  content: LinkedInPostContent;
  commentary: string;
} {
  const title = state.title || state.slug;
  const url = absoluteUrl(`/blog/${state.slug}`);

  if (state.documentUrn) {
    return {
      content: { type: "media", urn: state.documentUrn, title },
      commentary: `${title}\n\n${url}`,
    };
  }

  return {
    content: {
      type: "article",
      url,
      title,
      description: state.excerpt || undefined,
      thumbnail: state.coverImageLinkedInUrn || undefined,
    },
    commentary: title,
  };
}
