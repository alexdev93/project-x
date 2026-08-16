import React from "react";
import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { profile } from "@/content";

export const metadata: Metadata = {
  title: "Ask AI",
  description: `Ask questions about ${profile.name}'s experience, projects, architecture decisions and stack.`,
};

export default function AiPage() {
  return (
    // The shell's header is 4rem; filling the rest keeps the composer pinned to
    // the bottom of the viewport instead of below the fold.
    <div className="h-[calc(100dvh-4rem)]">
      {/* The visible heading belongs to the empty state and disappears once a
          conversation starts, so the page carries its own h1 for the outline. */}
      <h1 className="sr-only">
        Ask AI about {profile.shortName}&apos;s work
      </h1>
      <ChatPanel autoFocus />
    </div>
  );
}
