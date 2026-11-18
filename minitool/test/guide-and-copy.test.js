import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { generatePair, generateSingle } from "../src/engine/report.js";
import { person } from "../src/engine/pairing.js";
import { cardCopy, pairCardSpec, singleCardSpec, wrapText } from "../src/ui/card.js";
import { CAMP, ELEMENTS, THEMES, applyTheme, campId, currentTheme } from "../src/ui/theme.js";
import { TYPE_CODES } from "../src/engine/knowledge.js";
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

test("preference questions become the majority letters and are not a question bank", () => {
  const bank = JSON.parse(readFileSync(join(root, "../../data/oejts_zh.json"), "utf8"));
  const titles = bank.map(function (item) { return item.title; });
  const choices = {};
  for (const dim of DIMENSIONS) {
    for (const question of dim.questions) {
      assert.equal(titles.indexOf(question.prompt), -1);
      for (const option of question.options) assert.equal(titles.indexOf(option.text), -1);
      choices[question.id] = question.options[0].letter;
    }
  }
  assert.equal(codeFromChoices(choices), "ESTJ");
  assert.equal(codeFromChoices({ EI1: "I" }), null);
  assert.match(GUIDE_NOTE, /不是心理测评/);
});

test("each dimension resolves by majority vote", () => {
  const choices = {
    EI1: "E", EI2: "I", EI3: "I",
    SN1: "S", SN2: "S", SN3: "N",
    TF1: "T", TF2: "F", TF3: "F",
    JP1: "J", JP2: "J", JP3: "P",
  };
  assert.equal(codeFromChoices(choices), "ISFJ");
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

test("color themes switch in memory and keep the cream card on the brand palette", () => {
  assert.equal(THEMES.length, 4);
  assert.equal(applyTheme("peach").name, "蜜桃粉");
  assert.equal(currentTheme().id, "peach");
  applyTheme("missing");
  assert.equal(currentTheme().id, "cream");
  const cream = currentTheme();
  assert.equal(cream.accent, "#7454C8");
  assert.equal(cream.accentHover, "#6448AC");
  assert.equal(cream.bg, "#F5F0FC");
  assert.equal(cream.ink, "#352942");
  assert.equal(cream.muted, "#61586C");
  assert.equal(cream.card, "#FFFFFF");
  assert.equal(cream.line, "#D4C4F3");
  assert.equal(cream.accentSoft, "#E9DDFC");
  assert.equal(cream.gold, "#D4B56E");
  assert.equal(cream.cardAccent, "#7454C8");
  assert.equal(CAMP.nt.color, "#805FBE");
  assert.equal(CAMP.nf.color, "#3B9C80");
  assert.equal(CAMP.sj.color, "#4F91CA");
  assert.equal(CAMP.sp.color, "#CA8C36");
  assert.equal(ELEMENTS.fire.color, "#E57C68");
  assert.equal(ELEMENTS.earth.color, "#78A78A");
  assert.equal(ELEMENTS.air.color, "#6AADD3");
  assert.equal(ELEMENTS.water.color, "#8B82D1");
  const expected = {
    INTJ: "nt", INTP: "nt", ENTJ: "nt", ENTP: "nt",
    INFJ: "nf", INFP: "nf", ENFJ: "nf", ENFP: "nf",
    ISTJ: "sj", ISFJ: "sj", ESTJ: "sj", ESFJ: "sj",
    ISTP: "sp", ISFP: "sp", ESTP: "sp", ESFP: "sp",
  };
  assert.equal(TYPE_CODES.length, 16);
  for (let i = 0; i < TYPE_CODES.length; i += 1) {
    assert.equal(campId(TYPE_CODES[i]), expected[TYPE_CODES[i]]);
  }
  const css = readFileSync(join(srcRoot, "styles.css"), "utf8");
  const tokens = ["#7454C8", "#6448AC", "#E9DDFC", "#F5F0FC", "#FFFFFF", "#352942", "#61586C", "#D4C4F3", "#D7C4F2", "#D4B56E", "#805FBE", "#3B9C80", "#4F91CA", "#CA8C36", "#E57C68", "#78A78A", "#6AADD3", "#8B82D1"];
  for (let i = 0; i < tokens.length; i += 1) {
    assert.equal(css.toUpperCase().indexOf(tokens[i].toUpperCase()) !== -1, true, tokens[i]);
  }
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
