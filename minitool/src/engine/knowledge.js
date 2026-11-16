import typesJson from "../../../data/types.json" with { type: "json" };
import signsJson from "../../../data/signs.json" with { type: "json" };
import rulesJson from "../../../data/rules.json" with { type: "json" };

export const TYPE_CODES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

export const SIGN_KEYS = [
  "白羊", "金牛", "双子", "巨蟹", "狮子", "处女",
  "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼",
];

export function getType(code) {
  const key = String(code).toUpperCase();
  const row = typesJson[key];
  if (!row) throw new Error("未知的类型：" + key);
  return { code: key, ...row };
}

export function getSign(key) {
  const name = String(key).replace(/座/g, "");
  const row = signsJson[name];
  if (!row) throw new Error("未知的星座：" + name);
  return { key: name, ...row };
}

export function rules() {
  return rulesJson;
}
