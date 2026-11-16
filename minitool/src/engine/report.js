import { singleBundle } from "./combo.js";
import { pairBundle } from "./pairing.js";

export const REPORT_DISCLAIMER = "根据资料库生成，仅供娱乐参考。";

const PAIR_HUGS = [
  "你们不必完全一样，愿意理解彼此的不同，就是最好的默契。",
  "靠近一个人，是带着自己的样子，也接住对方的样子。",
  "慢慢来，好的关系都是一点点相处出来的。",
];

function leastOverlap(picked, options) {
  const stop = "，。、；：「」的了和也很能";
  const used = new Set();
  const joined = picked.join("");
  for (let i = 0; i < joined.length; i += 1) {
    const ch = joined[i];
    if (stop.indexOf(ch) === -1) used.add(ch);
  }
  let best = options[0];
  let bestScore = Infinity;
  for (let i = 0; i < options.length; i += 1) {
    const chars = new Set(Array.from(options[i].slice(0, 6)));
    let inter = 0;
    chars.forEach(function (ch) {
      if (used.has(ch)) inter += 1;
    });
    const score = inter / Math.max(1, chars.size);
    if (score < bestScore) {
      bestScore = score;
      best = options[i];
    }
  }
  return best;
}

export function fallbackSingle(bundle) {
  const typeInfo = bundle.type;
  const sign = bundle.sign;
  const strengths = typeInfo.strengths.slice(0, 2);
  const blindspots = typeInfo.blindspots.slice(0, 2);
  return {
    nickname: bundle.nickname,
    one_liner: bundle.one_liner,
    core: typeInfo.core + sign.core,
    strengths: strengths.concat([leastOverlap(strengths, sign.strengths)]),
    blindspots: blindspots.concat([leastOverlap(blindspots, sign.blindspots)]),
    love: typeInfo.love + sign.name + "的你" + sign.love,
    work: typeInfo.work + "另外，" + sign.name + "的你也" + sign.work,
    matches: bundle.matches,
    hug: typeInfo.hug,
  };
}

function codePointSum(text) {
  let sum = 0;
  for (let i = 0; i < text.length; i += 1) sum += text.charCodeAt(i);
  return sum;
}

export function fallbackPair(bundle) {
  const a = bundle.a;
  const b = bundle.b;
  let same = 0;
  for (let i = 0; i < 4; i += 1) if (a.type.code[i] === b.type.code[i]) same += 1;
  let typeLine;
  if (same >= 3) typeLine = "你们的 16 型人格有 " + same + " 个字母相同，很多想法不用解释就能懂。";
  else if (same === 2) typeLine = "你们的 16 型人格一半相同、一半不同，既有共同语言，也有互相学习的空间。";
  else typeLine = "你们的 16 型人格差别不小，正好能看见彼此看不到的那一面。";
  const seed = codePointSum(a.label + b.label);
  return {
    title: bundle.element_pair.title,
    one_liner: bundle.element_pair.text,
    chemistry: a.label + "的「" + a.nickname + "」，遇见" + b.label + "的「" + b.nickname + "」。" + bundle.element_pair.text + typeLine,
    highlights: bundle.highlights,
    frictions: bundle.frictions,
    date_idea: bundle.date_idea,
    hug: PAIR_HUGS[seed % PAIR_HUGS.length],
  };
}

export function generateSingle(typeCode, signKey) {
  const bundle = singleBundle(typeCode, signKey);
  const report = fallbackSingle(bundle);
  return {
    nickname: report.nickname,
    one_liner: report.one_liner,
    core: report.core,
    strengths: report.strengths,
    blindspots: report.blindspots,
    love: report.love,
    work: report.work,
    matches: report.matches,
    hug: report.hug,
    label: bundle.label,
    type_code: bundle.type.code,
    sign_key: bundle.sign.key,
    type_nickname: bundle.type.nickname,
    sign: {
      name: bundle.sign.name,
      symbol: bundle.sign.symbol,
      element: bundle.sign.element,
      modality: bundle.sign.modality,
      dates: bundle.sign.dates,
    },
    keywords: bundle.keywords,
    signals: bundle.signals,
    source: "template",
  };
}

export function generatePair(a, b) {
  const bundle = pairBundle(a, b);
  const report = fallbackPair(bundle);
  return {
    title: report.title,
    one_liner: report.one_liner,
    chemistry: report.chemistry,
    highlights: report.highlights,
    frictions: report.frictions,
    date_idea: report.date_idea,
    hug: report.hug,
    score: bundle.score,
    a: {
      label: bundle.a.label,
      nickname: bundle.a.nickname,
      element: bundle.a.sign.element,
      symbol: bundle.a.sign.symbol,
    },
    b: {
      label: bundle.b.label,
      nickname: bundle.b.nickname,
      element: bundle.b.sign.element,
      symbol: bundle.b.sign.symbol,
    },
    element_pair: bundle.element_pair.key,
    source: "template",
  };
}
