import fs from "fs";
import path from "path";
import sharp from "sharp";

// Källa i repot (originalen du laddar upp via webben)
const SRC = "raw";

// Målmappar för optimerade .webp
const OUT = "logos";
const HEIGHTS = { tiny: 24, table: 56, header: 112 };

// Säkerställ målmappar
for (const v of Object.keys(HEIGHTS)) fs.mkdirSync(path.join(OUT, v), { recursive: true });

if (!fs.existsSync(SRC)) {
  console.error(`❌ Hittade inte mappen ${SRC}/ i repot`);
  process.exit(1);
}

// Hämta alla bildfiler
const all = fs.readdirSync(SRC).filter(f => /\.(svg|png|jpg|jpeg|webp)$/i.test(f));
if (!all.length) {
  console.error(`❌ Inga bildfiler i ${SRC}/`);
  process.exit(1);
}

// Slugifiera till 'url_team'-stil
const slugify = (s) => s
  .toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/&/g, " och ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");

// Bygg jobb-lista
const tasks = [];
for (const fname of all) {
  const inPath = path.join(SRC, fname);
  const baseName = path.basename(fname, path.extname(fname));
  const slug = slugify(baseName);

  for (const [folder, h] of Object.entries(HEIGHTS)) {
    const outBase = path.join(OUT, folder, slug);
    tasks.push(async () => {
      await sharp(inPath)
        .resize({ height: h, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(`${outBase}@1x.webp`);

      await sharp(inPath)
        .resize({ height: h * 2, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(`${outBase}@2x.webp`);
    });
  }
}

// Kör i liten parallell pool
const runPool = async (concurrency = 4) => {
  let idx = 0, done = 0;
  const worker = async () => {
    while (idx < tasks.length) {
      const my = idx++; 
      await tasks[my]();
      done++;
      if (done % 25 === 0 || done === tasks.length) {
        console.log(`Progress: ${done}/${tasks.length}`);
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
};

console.time("build");
await runPool(4);
console.timeEnd("build");
console.log(`✅ Klart: ${tasks.length} jobb. Skapade .webp i logos/{tiny,table,header}.`);
