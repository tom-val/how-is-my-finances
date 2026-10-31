import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, View } from "react-native";
import { colorScheme as nativewindColorScheme, useColorScheme, vars } from "nativewind";
import { getItem, setItem } from "@/lib/storage";
import {
  ACCENT_PRESETS,
  CHART_COLOURS,
  resolvePalette,
  rgb,
  TOKENS,
  type ColourScheme,
  type Palette,
  type Token,
} from "./palette";

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "theme";
const ACCENT_KEY = "accent-colour";

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  accent: string;
  setAccent: (key: string) => void;
  /** The scheme actually in use after resolving "system". */
  scheme: ColourScheme;
  /** Token colours as `rgb(...)` strings for props that can't take a className (icons, charts). */
  colours: Record<Token, string>;
  chartColours: string[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  const stored = getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function toCssVars(palette: Palette): Record<string, string> {
  return Object.fromEntries(TOKENS.map((token) => [`--${token}`, palette[token]]));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [accent, setAccentState] = useState<string>(() => getItem(ACCENT_KEY) ?? "default");

  // `useColorScheme().setColorScheme` is a new function every render; the module-level setter is stable.
  useEffect(() => {
    nativewindColorScheme.set(preference);
  }, [preference]);

  const scheme: ColourScheme = colorScheme === "dark" ? "dark" : "light";
  const palette = useMemo(() => resolvePalette(scheme, accent), [scheme, accent]);
  const cssVars = useMemo(() => toCssVars(palette), [palette]);

  // RN Modal portals to <body> on web, outside the View that carries the variables, so mirror them
  // onto <html> as well. Native passes variables through React context and needs nothing extra.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const root = document.documentElement;
    for (const [name, value] of Object.entries(cssVars)) root.style.setProperty(name, value);
    root.style.colorScheme = scheme;
  }, [cssVars, scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      setPreference: (next) => {
        setItem(THEME_KEY, next);
        setPreferenceState(next);
      },
      accent,
      setAccent: (key) => {
        const valid = ACCENT_PRESETS.some((p) => p.key === key) ? key : "default";
        setItem(ACCENT_KEY, valid);
        setAccentState(valid);
      },
      scheme,
      colours: Object.fromEntries(TOKENS.map((t) => [t, rgb(palette[t])])) as Record<Token, string>,
      chartColours: CHART_COLOURS[scheme],
    }),
    [preference, accent, scheme, palette],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={vars(cssVars)} className="flex-1 bg-background">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
