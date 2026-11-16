import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { generatePair, generateSingle } from "../src/engine/report.js";
import { person } from "../src/engine/pairing.js";
import { cardCopy, pairCardSpec, singleCardSpec, wrapText } from "../src/ui/card.js";
import { DIMENSIONS, GUIDE_NOTE, codeFromChoices } from "../src/ui/guide.js";
import { noteIssues, pairNote, singleNote } from "../src/ui/note.js";

const root = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(root, "../src");

function walk(dir, out) {
  const entries = readdirSync(dir);
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".js") || name.endsWith(".css") || name.endsWith(".html")) out.push(path);
  }
  return out;
}

test("four preferences become the chosen letters and are not a question bank", () => {
  const questions = JSON.parse(readFileSync(join(root, "../../data/oejts_zh.json"), "utf8"));
  const titles = questions.map(function (item) { return item.title; });
  const choices = {};
  for (const dim of DIMENSIONS) {
    assert.equal(titles.indexOf(dim.prompt), -1);
    for (const option of dim.options) assert.equal(titles.indexOf(option.text), -1);
    choices[dim.id] = dim.options[0].letter;
  }
  assert.equal(codeFromChoices(choices), "ESTJ");
  assert.equal(codeFromChoices({ EI: "I" }), null);
  assert.match(GUIDE_NOTE, /不是心理测评/);
});

test("notes and share-card copy stay inside the review limits", () => {
  const single = generateSingle("INFP", "双鱼");
  const pair = generatePair(person("INFP", "双鱼"), person("ENTJ", "狮子"));
  const blocked = ["注定", "命中", "预测", "科学", "诊断", "算命", "MBTI", "一定会"];
  for (const note of [singleNote(single), pairNote(pair)]) {
    assert.deepEqual(noteIssues(note), []);
    const blob = note.title + note.content;
    for (const word of blocked) assert.equal(blob.indexOf(word), -1);
  }
  const singleCopy = cardCopy(singleCardSpec(single));
  const pairCopy = cardCopy(pairCardSpec(pair));
  assert.equal(singleCopy.disclaimer, "仅供娱乐参考");
  assert.equal(pairCopy.disclaimer, "仅供娱乐参考");
  assert.equal(singleCopy.lines.join("").indexOf("1990"), -1);
  assert.equal(pairCopy.lines.join("\n").indexOf("年"), -1);
  const wrapped = wrapText("INFP stays together，然后换行", function (text) { return text.length * 10; }, 80, 2);
  assert.ok(wrapped.length <= 2);
  assert.match(wrapped[0], /INFP/);
});

test("handwritten minitool copy avoids diagnosis and fortune claims", () => {
  const banned = ["注定", "命中", "预测", "科学测试", "心理诊断", "算命", "MBTI", "一定会", "oejts"];
  const files = walk(srcRoot, []);
  files.push(join(root, "../index.html"));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const word of banned) assert.equal(text.toLowerCase().indexOf(word.toLowerCase()), -1, file + " contains " + word);
  }
});
