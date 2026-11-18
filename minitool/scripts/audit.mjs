import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const skill = fileURLToPath(new URL("../../.skill/minitool-zip-builder/scripts/", import.meta.url));
const banned = [
  ["fetch(", "fetch"],
  ["XMLHttpRequest", "XMLHttpRequest"],
  ["eval(", "eval"],
  ["new Function", "new Function"],
  ["onclick=", "inline handler"],
  ['type="module"', "module script"],
  ["oejts", "OEJTS question bank"],
  ["localStorage", "localStorage"],
  ["sessionStorage", "sessionStorage"],
  ["<iframe", "iframe"],
  ["http://", "http url"],
  ["https://", "https url"],
];

function files(dir) {
  return readdirSync(dir).filter(function (name) { return statSync(join(dir, name)).isFile(); });
}

let failed = false;
const names = files("dist");
if (names.indexOf("index.html") === -1) {
  console.error("ERROR dist/index.html missing");
  failed = true;
}
for (const name of names) {
  const text = readFileSync(join("dist", name), "utf8");
  for (const rule of banned) {
    if (text.indexOf(rule[0]) !== -1) {
      console.error("ERROR " + name + " contains " + rule[1]);
      failed = true;
    }
  }
}

const html = readFileSync("dist/index.html", "utf8");
const scriptSrcOk = html.indexOf('src="./app.js"') !== -1 || html.indexOf('src="./app.js?') !== -1;
if (html.indexOf("<script>") !== -1 || (html.indexOf("<script ") !== -1 && !scriptSrcOk)) {
  console.error("ERROR inline or unexpected script");
  failed = true;
}

try {
  execFileSync("node", [join(skill, "audit_artifact.mjs"), "dist"], { stdio: "inherit" });
  execFileSync("python3", [join(skill, "audit_artifact.py"), "dist"], { stdio: "inherit" });
  const zip = fileURLToPath(new URL("../16type-zodiac-minitool.zip", import.meta.url));
  execFileSync("node", [join(skill, "audit_artifact.mjs"), zip], { stdio: "inherit" });
  execFileSync("python3", [join(skill, "audit_artifact.py"), zip], { stdio: "inherit" });
} catch (error) {
  failed = true;
}

if (failed) process.exit(1);
console.log("audit ok");
