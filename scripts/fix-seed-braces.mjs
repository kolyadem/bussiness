import fs from "node:fs";

const path = "prisma/seed-storefront.ts";
let s = fs.readFileSync(path, "utf8");
s = s.replace(
  /(\n      uk: \{ name: [^}]+\},)\n  \},\n  \{/g,
  "$1\n    },\n  },\n  {",
);
fs.writeFileSync(path, s);
