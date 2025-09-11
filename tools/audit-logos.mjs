// tools/audit-logos.mjs
import { globby } from "globby";
import sharp from "sharp";
import fs from "fs";

const targets = {
  tiny:   { x1: 24,  x2: 48,  warn1: 25_000, warn2: 60_000 },
  table:  { x1: 56,  x2: 112, warn1: 25_000, warn2: 60_000 },
  header: { x1: 112, x2: 224, warn1: 35_000, warn2: 90_000 },
};

const pad = (s, n) => String(s).padEnd(n);
const kb  = b => `${Math.round(b/1024)} KB`;

const files = await globby([
  "logos/{tiny,table,header}/*@1x.webp",
  "logos/{tiny,table,header}/*@2x.webp",
]);

let issues = 0;
for (const f of files) {
  const m = f.match(/logos\/(tiny|table|header)\/(.+)@([12])x\.webp$/);
  if (!m) continue;
  const [, variant, slug, scale] = m;
  const st   = fs.statSync(f);
  const meta = await sharp(f).metadata();

  const { x1, x2, warn1, warn2 } = targets[variant];
  const want = scale === "1" ? x1 : x2;
  const warn = scale === "1" ? warn1 : warn2;

  const badPx   = !(meta.width === want && meta.height === want);
  const badSize = st.size > warn;

  if (badPx || badSize) {
    issues++;
    const why = [];
    if (badPx)   why.push(`px ${meta.width}×${meta.height} (vill ${want}×${want})`);
    if (badSize) why.push(`storlek ${kb(st.size)} (gräns ${kb(warn)})`);
    console.log(`${pad(variant,6)} ${pad(`${slug}@${scale}x`,40)} → ${why.join(", ")}`);
  }
}

console.log(issues ? `\n⚠️  ${issues} filer behöver åtgärd.` : "✅ Alla loggor ser bra ut.");
