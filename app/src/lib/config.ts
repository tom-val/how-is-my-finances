/**
 * Build-time configuration. `EXPO_PUBLIC_*` values are inlined by Metro: from app/.env locally, from
 * the deploy workflow for the web build, and from the EAS "production" environment for native
 * builds and OTA updates.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Copy app/.env.example to app/.env and fill it in.`);
  }
  return value;
}

export const SUPABASE_URL = required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = required(
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
export const API_URL = required("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL);

/** Public web origin, used for links that must open in a browser (password reset on web). */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://finances.valiunas.dev";
