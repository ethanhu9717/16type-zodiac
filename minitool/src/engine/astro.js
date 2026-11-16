import { SIGN_KEYS, getSign } from "./knowledge.js";

const STARTS = [
  [1, 20, "水瓶"],
  [2, 19, "双鱼"],
  [3, 21, "白羊"],
  [4, 20, "金牛"],
  [5, 21, "双子"],
  [6, 22, "巨蟹"],
  [7, 23, "狮子"],
  [8, 23, "处女"],
  [9, 23, "天秤"],
  [10, 24, "天蝎"],
  [11, 23, "射手"],
  [12, 22, "摩羯"],
];

export function dateFromParts(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function sunSignKey(date) {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  let sign = "摩羯";
  for (let i = 0; i < STARTS.length; i += 1) {
    const start = STARTS[i];
    if (month > start[0] || (month === start[0] && day >= start[1])) sign = start[2];
  }
  return sign;
}

export function sunSign(date) {
  return getSign(sunSignKey(date));
}

function shiftDay(date, delta) {
  return new Date(date.getTime() + delta * 86400000);
}

export function cuspNote(date) {
  const here = sunSignKey(date);
  for (let i = 0; i < 2; i += 1) {
    const delta = i === 0 ? -1 : 1;
    const other = sunSignKey(shiftDay(date, delta));
    if (other !== here) {
      return "你的生日在星座交界附近，每年的交界日可能差一天，也可以看看" + getSign(other).name + "的解读。";
    }
  }
  return null;
}

export function makeBirthday(year, month, day, today) {
  if (month == null || day == null) return { date: null, message: null };
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { date: null, message: year + " 年 " + month + " 月没有 " + day + " 日，换一天吧。" };
  }
  const todayDate = today || new Date();
  const todayUtc = Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), todayDate.getUTCDate());
  if (date.getTime() > todayUtc) return { date: null, message: "这一天还没到哦，再看看年份？" };
  return { date, message: null };
}

export function allSignKeys() {
  return SIGN_KEYS;
}
