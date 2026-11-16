import esbuild from "esbuild";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

await esbuild.build({
  entryPoints: ["src/main.js"],
  bundle: true,
  outfile: "dist/app.js",
  format: "iife",
  target: ["es2017", "chrome61"],
  legalComments: "none",
  charset: "utf8",
  minify: true,
});

copyFileSync("index.html", "dist/index.html");
copyFileSync("src/styles.css", "dist/style.css");
console.log("built dist/");
