"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The server cannot know the resolved theme, so render a neutral
  // placeholder until hydration rather than guessing and flipping the icon.
  useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={className}
      aria-label={
        mounted
          ? `Switch to ${resolved === "dark" ? "light" : "dark"} theme`
          : "Switch theme"
      }
    >
      {mounted && resolved === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
