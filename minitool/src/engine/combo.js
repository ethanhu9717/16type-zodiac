import { getSign, getType, rules } from "./knowledge.js";
import { bestMatches, matchReason, person } from "./pairing.js";

const DIM_NAMES = {
  EI: "能量方向",
  SN: "看世界的方式",
  TF: "做决定的方式",
  JP: "生活节奏",
};

function fill(text, sign) {
  return text
    .split("{sign}").join(sign.name)
    .split("{element}").join(sign.element)
    .split("{modality}").join(sign.modality);
}

export function signals(typeCode, sign) {
  const ruleSet = rules();
  const groups = ruleSet.element_groups;
  const single = ruleSet.single;
  const element = sign.element;
  const modality = sign.modality;
  const ei = typeCode[0] + "_" + (groups.outward.indexOf(element) !== -1 ? "outward" : "inward");
  let snSuffix = "earth";
  if (groups.idea.indexOf(element) !== -1) snSuffix = "idea";
  else if (element === "水") snSuffix = "water";
  const sn = typeCode[1] + "_" + snSuffix;
  const tf = typeCode[2] + "_" + (groups.feeling.indexOf(element) !== -1 ? "feeling" : "logic");
  const jp = typeCode[3] + "_" + modality;
  const pairs = [["EI", ei], ["SN", sn], ["TF", tf], ["JP", jp]];
  return pairs.map(function (item) {
    const rule = single[item[0]][item[1]];
    return {
      dim: item[0],
      dim_name: DIM_NAMES[item[0]],
      kind: rule.kind,
      text: fill(rule.text, sign),
    };
  });
}

export function singleBundle(typeCode, signKey) {
  const typeInfo = getType(typeCode);
  const sign = getSign(signKey);
  const me = person(typeInfo.code, sign.key);
  const matches = bestMatches(me).map(function (other) {
    return { combo: other.typeCode + " × " + getSign(other.signKey).name, reason: matchReason(me, other) };
  });
  return {
    label: me.typeCode + " × " + sign.name,
    type: typeInfo,
    sign,
    nickname: sign.prefix + typeInfo.nickname,
    one_liner: typeInfo.tagline + "，" + sign.tint + "。",
    keywords: typeInfo.keywords.slice(0, 2).concat(sign.keywords.slice(0, 2)),
    signals: signals(typeInfo.code, sign),
    matches,
  };
}
