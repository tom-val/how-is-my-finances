import { useState, useEffect, useCallback } from "react";

export interface AccentPreset {
  key: string;
  label: string;
  swatch: string;
  light: { primary: string; primaryForeground: string };
  dark: { primary: string; primaryForeground: string };
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    key: "default",
    label: "Default",
    swatch: "#333333",
    light: { primary: "oklch(0.205 0 0)", primaryForeground: "oklch(0.985 0 0)" },
    dark: { primary: "oklch(0.922 0 0)", primaryForeground: "oklch(0.205 0 0)" },
  },
  {
    key: "blue",
    label: "Blue",
    swatch: "#2563eb",
    light: { primary: "oklch(0.546 0.245 262.881)", primaryForeground: "oklch(0.985 0 0)" },
    dark: { primary: "oklch(0.623 0.214 259.815)", primaryForeground: "oklch(0.985 0 0)" },
  },
  {
    key: "green",
    label: "Green",
    swatch: "#16a34a",
    light: { primary: "oklch(0.596 0.194 149.214)", primaryForeground: "oklch(0.985 0 0)" },
    dark: { primary: "oklch(0.648 0.2 150.069)", primaryForeground: "oklch(0.985 0 0)" },
  },
  {
    key: "purple",
    label: "Purple",
    swatch: "#7c3aed",
    light: { primary: "oklch(0.494 0.265 293.541)", primaryForeground: "oklch(0.985 0 0)" },
    dark: { primary: "oklch(0.581 0.233 292.717)", primaryForeground: "oklch(0.985 0 0)" },
  },
  {
    key: "orange",
    label: "Orange",
    swatch: "#ea580c",
    light: { primary: "oklch(0.606 0.213 41.348)", primaryForeground: "oklch(0.985 0 0)" },
    dark: { primary: "oklch(0.66 0.2 41.348)", primaryForeground: "oklch(0.985 0 0)" },
  },
  {
    key: "rose",
    label: "Rose",
    swatch: "#e11d48",
    light: { primary: "oklch(0.555 0.246 12.211)", primaryForeground: "oklch(0.985 0 0)" },
    dark: { primary: "oklch(0.617 0.224 14.138)", primaryForeground: "oklch(0.985 0 0)" },
  },
];

const STORAGE_KEY = "accent-colour";

function applyAccent(key: string) {
  const preset = ACCENT_PRESETS.find((p) => p.key === key) ?? ACCENT_PRESETS[0];
  const el = document.documentElement;

  if (preset.key === "default") {
    el.style.removeProperty("--primary");
    el.style.removeProperty("--primary-foreground");
    el.removeAttribute("data-accent");
    return;
  }

  // We need to apply both light and dark values via a CSS approach.
  // Since next-themes toggles the .dark class, we use a data attribute
  // and let the component apply the correct values based on current theme.
  el.setAttribute("data-accent", preset.key);

  // Apply light values as base, dark mode overrides happen via the observer below.
  const isDark = el.classList.contains("dark");
  const values = isDark ? preset.dark : preset.light;
  el.style.setProperty("--primary", values.primary);
  el.style.setProperty("--primary-foreground", values.primaryForeground);
}

export function useAccentColour() {
  const [accentColour, setAccentColourState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? "default";
  });

  const setAccentColour = useCallback((key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setAccentColourState(key);
    applyAccent(key);
  }, []);

  return { accentColour, setAccentColour, presets: ACCENT_PRESETS };
}

/**
 * Renders nothing — applies the saved accent colour on mount and
 * observes class changes on <html> to re-apply when theme switches.
 */
export function AccentColourProvider() {
  useEffect(() => {
    const key = localStorage.getItem(STORAGE_KEY) ?? "default";
    applyAccent(key);

    // Watch for dark/light class changes to re-apply correct accent values
    const observer = new MutationObserver(() => {
      const currentKey = localStorage.getItem(STORAGE_KEY) ?? "default";
      if (currentKey !== "default") {
        applyAccent(currentKey);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
