import { execFileSync } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

if (!existsSync("dist/index.html") || !existsSync("dist/app.js") || !existsSync("dist/style.css")) {
  console.error("dist is incomplete; run build first");
  process.exit(1);
}

const zip = fileURLToPath(new URL("../16type-zodiac-minitool.zip", import.meta.url));
rmSync(zip, { force: true });
rmSync("dist/16type-zodiac-minitool.zip", { force: true });
execFileSync("zip", ["-r", "-X", zip, ".", "-x", "*.DS_Store"], { cwd: "dist" });
const size = statSync(zip).size;
console.log(zip + " " + size + " bytes");
if (size > 10 * 1024 * 1024) {
  console.error("zip exceeds 10 MiB");
  process.exit(1);
}
