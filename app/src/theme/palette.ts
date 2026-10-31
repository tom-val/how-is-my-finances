/**
 * Theme tokens as RGB triplets ("r g b"), ported from the PWA's shadcn/ui neutral theme
 * (OKLCH in frontend/src/index.css). ThemeProvider feeds them to NativeWind as CSS variables, which
 * tailwind.config.js reads as `rgb(var(--name) / <alpha-value>)`.
 *
 * Dark `border`/`input` were translucent white in the PWA; they are flattened to the colour they
 * produced over the dark card so they stay a plain triplet.
 */
export type ColourScheme = "light" | "dark";

export const TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
] as const;

export type Token = (typeof TOKENS)[number];
export type Palette = Record<Token, string>;

export const PALETTES: Record<ColourScheme, Palette> = {
  light: {
    background: "255 255 255",
    foreground: "10 10 10",
    card: "255 255 255",
    "card-foreground": "10 10 10",
    popover: "255 255 255",
    "popover-foreground": "10 10 10",
    primary: "23 23 23",
    "primary-foreground": "250 250 250",
    secondary: "245 245 245",
    "secondary-foreground": "23 23 23",
    muted: "245 245 245",
    "muted-foreground": "115 115 115",
    accent: "245 245 245",
    "accent-foreground": "23 23 23",
    destructive: "231 0 11",
    border: "229 229 229",
    input: "229 229 229",
    ring: "161 161 161",
  },
  dark: {
    background: "10 10 10",
    foreground: "250 250 250",
    card: "23 23 23",
    "card-foreground": "250 250 250",
    popover: "23 23 23",
    "popover-foreground": "250 250 250",
    primary: "229 229 229",
    "primary-foreground": "23 23 23",
    secondary: "38 38 38",
    "secondary-foreground": "250 250 250",
    muted: "38 38 38",
    "muted-foreground": "161 161 161",
    accent: "38 38 38",
    "accent-foreground": "250 250 250",
    destructive: "255 100 103",
    border: "46 46 46",
    input: "56 56 56",
    ring: "115 115 115",
  },
};

export interface AccentPreset {
  key: string;
  label: string;
  swatch: string;
  light: { primary: string; primaryForeground: string };
  dark: { primary: string; primaryForeground: string };
}

/** The six accent presets from the PWA settings page (OKLCH values converted to RGB). */
export const ACCENT_PRESETS: AccentPreset[] = [
  {
    key: "default",
    label: "Default",
    swatch: "#333333",
    light: { primary: "23 23 23", primaryForeground: "250 250 250" },
    dark: { primary: "229 229 229", primaryForeground: "23 23 23" },
  },
  {
    key: "blue",
    label: "Blue",
    swatch: "#2563eb",
    light: { primary: "21 93 252", primaryForeground: "250 250 250" },
    dark: { primary: "43 127 255", primaryForeground: "250 250 250" },
  },
  {
    key: "green",
    label: "Green",
    swatch: "#16a34a",
    light: { primary: "0 156 52", primaryForeground: "250 250 250" },
    dark: { primary: "0 174 68", primaryForeground: "250 250 250" },
  },
  {
    key: "purple",
    label: "Purple",
    swatch: "#7c3aed",
    light: { primary: "114 18 229", primaryForeground: "250 250 250" },
    dark: { primary: "133 79 244", primaryForeground: "250 250 250" },
  },
  {
    key: "orange",
    label: "Orange",
    swatch: "#ea580c",
    light: { primary: "227 64 0", primaryForeground: "250 250 250" },
    dark: { primary: "241 90 5", primaryForeground: "250 250 250" },
  },
  {
    key: "rose",
    label: "Rose",
    swatch: "#e11d48",
    light: { primary: "221 0 74", primaryForeground: "250 250 250" },
    dark: { primary: "236 43 90", primaryForeground: "250 250 250" },
  },
];

/** Chart series colours (shadcn chart-1..5), as hex for react-native-gifted-charts / SVG. */
export const CHART_COLOURS: Record<ColourScheme, string[]> = {
  light: ["#f54900", "#009689", "#104e64", "#ffb900", "#fe9a00"],
  dark: ["#1447e6", "#00bc7d", "#fe9a00", "#ad46ff", "#ff2056"],
};

export function resolvePalette(scheme: ColourScheme, accentKey: string): Palette {
  const base = PALETTES[scheme];
  const accent = ACCENT_PRESETS.find((p) => p.key === accentKey) ?? ACCENT_PRESETS[0];
  return {
    ...base,
    primary: accent[scheme].primary,
    "primary-foreground": accent[scheme].primaryForeground,
  };
}

/** "r g b" → "rgb(r, g, b)" (or rgba with alpha) for places that need a plain colour string. */
export function rgb(triplet: string, alpha = 1): string {
  const [r, g, b] = triplet.split(" ");
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
