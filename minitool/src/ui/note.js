export function charLength(text) {
  return Array.from(text).length;
}

export function clipChars(text, max) {
  const chars = Array.from(text);
  if (chars.length <= max) return chars.join("");
  return chars.slice(0, max).join("");
}

function signShort(name) {
  return String(name).replace(/座$/, "");
}

export function singleNote(report) {
  const title = clipChars(signShort(report.sign.name) + " " + report.type_code + " 的小卡片", 20);
  const content = [
    report.label + " · " + report.nickname,
    report.one_liner,
    "根据资料库整理，仅供娱乐参考。",
  ].join("\n");
  return { title, content };
}

export function pairNote(report) {
  const title = clipChars("我们的性格配对", 20);
  const content = [
    "你 " + report.a.label + "（" + report.a.nickname + "）",
    "TA " + report.b.label + "（" + report.b.nickname + "）",
    report.title + " · 默契指数 " + report.score,
    "根据资料库整理，仅供娱乐参考。",
  ].join("\n");
  return { title, content };
}

export function noteIssues(note) {
  const issues = [];
  if (charLength(note.title) > 20) issues.push("title-length");
  if (charLength(note.content) > 1000) issues.push("content-length");
  if (note.content.indexOf("仅供娱乐参考") === -1) issues.push("disclaimer");
  const blob = note.title + "\n" + note.content;
  if (/\d{4}\s*年|\d{1,2}\s*月\s*\d{1,2}\s*日/.test(blob)) issues.push("birthday");
  return issues;
}
