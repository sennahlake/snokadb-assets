import fs from "fs";
import path from "path";
import sharp from "sharp";

/** Källa: iCloud-mappen som default */
const SRC = process.argv[2] || `${process.env.HOME}/Library/Mobile Documents/com~apple~CloudDocs/SnokaDb_loggor`;

/** Mål: optimerade loggor */
const OUT = "logos";
const HEIGHTS = { tiny: 24, table: 56, header: 112 };

fs.mkdirSync(OUT, { recursive: true });
for (const v of Object.keys(HEIGHTS)) fs.mkdirSync(path.join(OUT, v), { recursive: true });

const all = fs.readdirSync(SRC).filter(f => /\.(svg|png|jpg|jpeg|webp)$/i.test(f));
if (!all.length) {
  console.error(`❌ Hittade inga bildfiler i: ${SRC}`);
  process.exit(1);
}

// Slugifiera filnamn (så de matchar url_team)
const slugify = (s) => s
  .toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/&/g, " och ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");

for (const fname of all) {
  const inPath = path.join(SRC, fname);
  const baseName = path.basename(fname, path.extname(fname));
  const slug = slugify(baseName);

  for (const [folder, h] of Object.entries(HEIGHTS)) {
    const outBase = path.join(OUT, folder, slug);

    // 1x WEBP
    await sharp(inPath)
      .resize({ height: h, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(`${outBase}@1x.webp`);

    // 2x WEBP
    await sharp(inPath)
      .resize({ height: h * 2, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(`${outBase}@2x.webp`);
  }
}

console.log("✅ Klart: logos/{tiny,table,header} med @1x/@2x (endast webp).");
