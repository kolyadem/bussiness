/**
 * Removes `ru` and `en` translation blocks from prisma/seed-storefront.ts
 * (multiline object form used in this seed file).
 */
import fs from "node:fs";

const path = "prisma/seed-storefront.ts";
let s = fs.readFileSync(path, "utf8");
for (const key of ["ru", "en"]) {
  const re = new RegExp(`\\n\\s*${key}:\\s*\\{[\\s\\S]*?\\n\\s*\\},`, "g");
  let prev;
  do {
    prev = s;
    s = s.replace(re, "");
  } while (s !== prev);
}
fs.writeFileSync(path, s);
