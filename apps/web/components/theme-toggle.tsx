"use client";

import { Button } from "@rivet/ui";
import { useEffect, useState } from "react";

function currentTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function applyTheme(theme: "dark" | "light"): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("rivet-theme", theme);
  } catch {
    // Storage unavailable (private mode): the choice just won't persist.
  }
}

export function toggleTheme(): void {
  applyTheme(currentTheme() === "dark" ? "light" : "dark");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => setTheme(currentTheme()), []);

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      onClick={() => {
        toggleTheme();
        setTheme(currentTheme());
      }}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </Button>
  );
}
