import { SIGN_KEYS, TYPE_CODES, getSign, getType, rules } from "./knowledge.js";

const ELEMENT_ORDER = ["火", "土", "风", "水"];
const SCORE_MIN = 66;
const SCORE_MAX = 98;
const RAW_MIN = 35;
const RAW_MAX = 82;

export function person(typeCode, signKey) {
  return { typeCode, signKey };
}

export function personLabel(who) {
  return who.typeCode + " × " + getSign(who.signKey).name;
}

export function elementPairKey(left, right) {
  const pair = [left, right].slice().sort(function (a, b) {
    return ELEMENT_ORDER.indexOf(a) - ELEMENT_ORDER.indexOf(b);
  });
  return pair[0] + pair[1];
}

function typePoints(t1, t2) {
  const eiDiff = t1[0] !== t2[0];
  const snSame = t1[1] === t2[1];
  const tfDiff = t1[2] !== t2[2];
  const jpDiff = t1[3] !== t2[3];
  let pts = snSame ? 16 : 0;
  pts += eiDiff ? 8 : 5;
  pts += tfDiff ? 6 : 5;
  pts += jpDiff ? 7 : 5;
  if (snSame && eiDiff && jpDiff) pts += 8;
  return pts;
}

function signPoints(s1, s2) {
  const key = elementPairKey(s1.element, s2.element);
  const harmony = rules().pair.harmony;
  let pts = 20;
  if (harmony.same.indexOf(key) !== -1) pts = 32;
  else if (harmony.support.indexOf(key) !== -1) pts = 30;
  if (s1.modality !== s2.modality) pts += 5;
  return pts;
}

export function roundHalfEven(value) {
  const negative = value < 0;
  const abs = Math.abs(value);
  const floor = Math.floor(abs);
  const frac = abs - floor;
  let rounded;
  if (Math.abs(frac - 0.5) < 1e-9) rounded = floor % 2 === 0 ? floor : floor + 1;
  else rounded = Math.round(abs);
  return negative ? -rounded : rounded;
}

export function rawScore(a, b) {
  return typePoints(a.typeCode, b.typeCode) + signPoints(getSign(a.signKey), getSign(b.signKey));
}

export function displayScore(raw) {
  const span = SCORE_MAX - SCORE_MIN;
  return roundHalfEven(SCORE_MIN + (raw - RAW_MIN) * span / (RAW_MAX - RAW_MIN));
}

export function rankedCandidates(me) {
  const ranked = [];
  for (let ti = 0; ti < TYPE_CODES.length; ti += 1) {
    for (let si = 0; si < SIGN_KEYS.length; si += 1) {
      const other = person(TYPE_CODES[ti], SIGN_KEYS[si]);
      if (other.typeCode === me.typeCode && other.signKey === me.signKey) continue;
      const raw = rawScore(me, other);
      ranked.push({ neg: -raw, ti, si, raw, other });
    }
  }
  ranked.sort(function (a, b) {
    if (a.neg !== b.neg) return a.neg - b.neg;
    if (a.ti !== b.ti) return a.ti - b.ti;
    return a.si - b.si;
  });
  return ranked;
}

export function bestMatches(me, n) {
  const limit = n == null ? 3 : n;
  const picked = [];
  const ranked = rankedCandidates(me);
  for (let i = 0; i < ranked.length; i += 1) {
    const other = ranked[i].other;
    let clash = false;
    for (let j = 0; j < picked.length; j += 1) {
      if (picked[j].typeCode === other.typeCode || picked[j].signKey === other.signKey) clash = true;
    }
    if (clash) continue;
    picked.push(other);
    if (picked.length === limit) break;
  }
  return picked;
}

export function matchReason(me, other) {
  const pairRules = rules().pair;
  const s1 = getSign(me.signKey);
  const s2 = getSign(other.signKey);
  const ep = pairRules.element_pairs[elementPairKey(s1.element, s2.element)];
  const t1 = me.typeCode;
  const t2 = other.typeCode;
  let typePart;
  if (t1[1] === t2[1] && t1[0] !== t2[0] && t1[3] !== t2[3]) typePart = "思考同频、节奏互补";
  else if (t1[1] === t2[1]) typePart = "看世界的方式很接近";
  else typePart = "一个看细节、一个看大局";
  typePart += t1[2] !== t2[2] ? "，还能在理性和感性之间互相补位" : "，在乎的东西也很像";
  return typePart + "；星座上是「" + ep.title + "」。";
}

export function pairBundle(a, b) {
  const pairRules = rules().pair;
  const ta = getType(a.typeCode);
  const tb = getType(b.typeCode);
  const sa = getSign(a.signKey);
  const sb = getSign(b.signKey);
  const epKey = elementPairKey(sa.element, sb.element);
  const ep = pairRules.element_pairs[epKey];
  const dims = pairRules.dims;
  const c1 = a.typeCode;
  const c2 = b.typeCode;
  const highlights = [];
  const frictions = [];

  if (c1[1] === c2[1]) highlights.push(dims.SN_same[c1[1]]);
  else frictions.push(dims.SN_diff);

  const steps = [[0, "EI"], [2, "TF"], [3, "JP"]];
  for (let i = 0; i < steps.length; i += 1) {
    const idx = steps[i][0];
    const dim = steps[i][1];
    if (c1[idx] === c2[idx]) highlights.push(dims[dim + "_same"][c1[idx]]);
    else {
      highlights.push(dims[dim + "_diff"].highlight);
      frictions.push({ point: dims[dim + "_diff"].point, tip: dims[dim + "_diff"].tip });
    }
  }

  if (sa.modality === sb.modality) frictions.unshift(pairRules.modality[sa.modality]);
  else highlights.push(pairRules.modality.diff);

  if (frictions.length === 0) {
    frictions.push({
      point: "你们太像了，有时会一起钻进同一个牛角尖",
      tip: "偶尔约上朋友一起玩，给彼此带来新的视角。",
    });
  }

  const ideas = pairRules.date_ideas;
  const dateIdea = sa.element === sb.element
    ? "可以" + ideas[sa.element] + "。"
    : "可以" + ideas[sa.element] + "；也可以" + ideas[sb.element] + "。";

  return {
    a: { label: personLabel(a), type: ta, sign: sa, nickname: sa.prefix + ta.nickname },
    b: { label: personLabel(b), type: tb, sign: sb, nickname: sb.prefix + tb.nickname },
    element_pair: Object.assign({ key: epKey }, ep),
    score: displayScore(rawScore(a, b)),
    highlights: highlights.slice(0, 3),
    frictions: frictions.slice(0, 2),
    date_idea: dateIdea,
  };
}
