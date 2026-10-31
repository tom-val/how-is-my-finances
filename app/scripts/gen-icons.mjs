/**
 * Generates the app icons from the PWA's mark (white "F" on slate-900, see
 * frontend/scripts/generate-icons.mjs) into assets/images/.
 * Run: npm run icons
 */
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "images");

const BG = "#0f172a";
const FG = "#ffffff";

/** "F" centred in a `size` square; `scale` is the letter height relative to the square. */
function letter(size, { scale = 0.5, background = null, circle = false, colour = FG } = {}) {
  const fontSize = Math.round(size * scale);
  const c = size / 2;
  const bg = background
    ? circle
      ? `<circle cx="${c}" cy="${c}" r="${c}" fill="${background}" />`
      : `<rect width="${size}" height="${size}" fill="${background}" />`
    : "";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg}
  <text x="${c}" y="${c + fontSize * 0.35}" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="${colour}">F</text>
</svg>`);
}

async function write(svg, size, name) {
  await sharp(svg).resize(size, size).png().toFile(join(outDir, name));
  console.log(`Generated ${name}`);
}

// iOS / store icon: opaque, full bleed (the OS applies the mask).
await write(letter(1024, { background: BG }), 1024, "icon.png");
// Android adaptive icon: the foreground must sit inside the central 66% safe zone.
await write(letter(1024, { scale: 0.34 }), 1024, "android-icon-foreground.png");
await write(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${BG}"/></svg>`), 1024, "android-icon-background.png");
await write(letter(1024, { scale: 0.34 }), 1024, "android-icon-monochrome.png");
// Splash: the round PWA mark on the splash background colour.
await write(letter(512, { background: BG, circle: true }), 512, "splash-icon.png");
await write(letter(64, { background: BG, circle: true }), 64, "favicon.png");
