/**
 * Colour tokens mirror the shadcn/ui "neutral" theme the PWA used (frontend/src/index.css), converted
 * from OKLCH to RGB triplets. The values themselves live in src/theme/palette.ts and are applied as
 * CSS variables by ThemeProvider (NativeWind `vars()`), so light/dark and the accent colour switch at
 * runtime on iOS, Android and web alike.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        card: { DEFAULT: token("card"), foreground: token("card-foreground") },
        popover: { DEFAULT: token("popover"), foreground: token("popover-foreground") },
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
        secondary: { DEFAULT: token("secondary"), foreground: token("secondary-foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        accent: { DEFAULT: token("accent"), foreground: token("accent-foreground") },
        destructive: token("destructive"),
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "14px",
      },
    },
  },
  plugins: [],
};
