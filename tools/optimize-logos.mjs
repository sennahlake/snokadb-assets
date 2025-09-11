// tools/optimize-logos.mjs
import { globby } from "globby";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const targets = {
  tiny:   { x1: 24,  x2: 48  },
  table:  { x1: 56,  x2: 112 },
  header: { x1: 112, x2: 224 },
};

const webp1x = { quality: 82, effort: 6, smartSubsample: true };
const webp2x = { quality: 80, effort: 6, smartSubsample: true };

const resizeOpts = {
  fit: "contain",
  withoutEnlargement: false,
  background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent padding
};

async function ensureDir(p) {
  await fs.mkdir(path.dirname(p), { recursive: true });
}

async function writeSizedFromFile(srcPath, outPath, size, q) {
  await ensureDir(outPath);
  const tmp = outPath + ".tmp";
  await sharp(srcPath, { limitInputPixels: false })
    .resize(size, size, resizeOpts)
    .webp(q)
    .toFile(tmp);
  await fs.rename(tmp, outPath);
}

async function writeSizedFromBuffer(buf, outPath, size, q) {
  await ensureDir(outPath);
  const tmp = outPath + ".tmp";
  await sharp(buf, { limitInputPixels: false })
    .resize(size, size, resizeOpts)
    .webp(q)
    .toFile(tmp);
  await fs.rename(tmp, outPath);
}

// 1) Generera från RAW om det finns original där
async function fromRaw() {
  const sources = await globby(["raw/*.{svg,png,webp}"]);
  if (sources.length === 0) return false;
  for (const src of sources) {
    const slug = path.basename(src).replace(/\.(svg|png|webp)$/i, "");
    for (const [variant, { x1, x2 }] of Object.entries(targets)) {
      await writeSizedFromFile(src, `logos/${variant}/${slug}@1x.webp`, x1, webp1x);
      await writeSizedFromFile(src, `logos/${variant}/${slug}@2x.webp`, x2, webp2x);
      console.log(`✓ ${variant} ${slug} → ${x1}/${x2}px (from raw)`);
    }
  }
  return true;
}

// 2) Normalisera ALLA befintliga logos in-place via tempfil
async function normalizeExisting() {
  const files = await globby([
    "logos/{tiny,table,header}/*@1x.webp",
    "logos/{tiny,table,header}/*@2x.webp",
  ]);

  for (const f of files) {
    const m = f.match(/logos\/(tiny|table|header)\/(.+)@([12])x\.webp$/);
    if (!m) continue;
    const [, variant, slug, scale] = m;
    const { x1, x2 } = targets[variant];
    const want = scale === "1" ? x1 : x2;
    const q = scale === "1" ? webp1x : webp2x;

    // Läs till buffer → skriv till temp → ersätt original
    const buf = await fs.readFile(f);
    await writeSizedFromBuffer(buf, f, want, q);
    console.log(`✓ fix ${variant} ${slug}@${scale}x → ${want}px`);
  }
}

(async () => {
  await fromRaw();          // Bygg från källor om de finns
  await normalizeExisting(); // Tvinga alla befintliga till exakt kvadrat
  console.log("Klart. Kör nu: npm run audit:logos");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
