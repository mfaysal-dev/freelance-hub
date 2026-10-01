"use client";
import { useEffect } from "react";
import { useUI } from "@/lib/ui-store";

export function ThemeSync() {
  const theme = useUI((s) => s.theme);
  const accent = useUI((s) => s.accent);
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-h", String(accent));
  }, [accent]);
  return null;
}

export const ACCENTS: { name: string; hue: number }[] = [
  { name: "Emerald", hue: 160 },
  { name: "Teal", hue: 190 },
  { name: "Ocean", hue: 235 },
  { name: "Indigo", hue: 270 },
  { name: "Violet", hue: 300 },
  { name: "Rose", hue: 10 },
  { name: "Tangerine", hue: 50 },
  { name: "Amber", hue: 80 },
  { name: "Lime", hue: 130 },
];
