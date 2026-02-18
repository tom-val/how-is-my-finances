/**
 * Generates PWA icons from an SVG template.
 *
 * Outputs PNGs to public/icons/ and a favicon SVG to public/.
 * Run: node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");
const publicDir = join(__dirname, "..", "public");

// Theme colour — matches manifest theme_color (#0f172a = slate-900)
const BG_COLOUR = "#0f172a";
const FG_COLOUR = "#ffffff";

function createSvg(size, padding = 0) {
  const effectiveSize = size - padding * 2;
  const fontSize = Math.round(effectiveSize * 0.5);
  const cx = size / 2;
  const cy = size / 2;
  const r = effectiveSize / 2;
  // Slight vertical offset for optical centring of "F"
  const textY = cy + fontSize * 0.35;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${padding > 0 ? BG_COLOUR : "transparent"}" rx="0" />
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${BG_COLOUR}" />
  <text x="${cx}" y="${textY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="${FG_COLOUR}">F</text>
</svg>`);
}

const standardSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  await mkdir(iconsDir, { recursive: true });

  // Standard icons (no extra padding)
  for (const size of standardSizes) {
    const svg = createSvg(size);
    await sharp(svg).resize(size, size).png().toFile(join(iconsDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Apple touch icon (180x180)
  const appleSvg = createSvg(180);
  await sharp(appleSvg).resize(180, 180).png().toFile(join(iconsDir, "apple-touch-icon-180x180.png"));
  console.log("Generated apple-touch-icon-180x180.png");

  // Maskable icon (512x512 with safe zone padding — 20% on each side)
  const maskableSize = 512;
  const maskablePadding = Math.round(maskableSize * 0.1);
  const maskableSvg = createSvg(maskableSize, maskablePadding);
  await sharp(maskableSvg).resize(maskableSize, maskableSize).png().toFile(join(iconsDir, "maskable-icon-512x512.png"));
  console.log("Generated maskable-icon-512x512.png");

  // Favicon SVG (scalable, placed in public/)
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="16" fill="${BG_COLOUR}" />
  <text x="16" y="22.5" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="${FG_COLOUR}">F</text>
</svg>`;
  await writeFile(join(publicDir, "favicon.svg"), faviconSvg, "utf-8");
  console.log("Generated favicon.svg");

  console.log("\nDone! All icons generated.");
}

generateIcons().catch((error) => {
  console.error("Icon generation failed:", error);
  process.exit(1);
});
