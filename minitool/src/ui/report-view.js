import { REPORT_DISCLAIMER } from "../engine/report.js";

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function section(parent, title, accentClass) {
  const card = h("section", "card");
  card.appendChild(h("h2", accentClass, title));
  parent.appendChild(card);
  return card;
}

function bullets(parent, items) {
  const list = h("ul", "plain");
  for (let i = 0; i < items.length; i += 1) list.appendChild(h("li", "", items[i]));
  parent.appendChild(list);
}

export function renderFullReport(parent, model) {
  parent.textContent = "";
  const report = model.report;
  const accent = "accent";
  if (model.kind === "pair") {
    const head = section(parent, report.title, accent);
    head.appendChild(h("p", "muted", "你 " + report.a.label + "（" + report.a.nickname + "）"));
    head.appendChild(h("p", "muted", "TA " + report.b.label + "（" + report.b.nickname + "）"));
    head.appendChild(h("p", "score-line", "默契指数 " + report.score));
    head.appendChild(h("p", "", report.one_liner));
    section(parent, "你们的化学反应", accent).appendChild(h("p", "", report.chemistry));
    bullets(section(parent, "相处亮点", accent), report.highlights);
    const friction = section(parent, "可能的小摩擦", accent);
    const list = h("ul", "plain");
    for (let i = 0; i < report.frictions.length; i += 1) {
      const item = h("li", "");
      item.appendChild(h("b", "", report.frictions[i].point));
      item.appendChild(h("p", "tip", "小建议：" + report.frictions[i].tip));
      list.appendChild(item);
    }
    friction.appendChild(list);
    section(parent, "适合你们的相处方式", accent).appendChild(h("p", "", report.date_idea));
    const hug = section(parent, "写给你们", accent);
    hug.appendChild(h("p", "hug", "「" + report.hug + "」"));
  } else {
    const head = section(parent, report.label, accent);
    head.appendChild(h("p", "nick", report.nickname));
    head.appendChild(h("p", "", report.one_liner));
    const tags = h("p", "tags");
    for (let i = 0; i < report.keywords.length; i += 1) tags.appendChild(h("span", "tag", report.keywords[i]));
    head.appendChild(tags);
    const core = section(parent, "性格核心", accent);
    core.appendChild(h("p", "", report.core));
    const sigs = h("div", "signals");
    for (let i = 0; i < report.signals.length; i += 1) {
      const row = h("p", "signal");
      row.appendChild(h("span", "kind", report.signals[i].kind));
      row.appendChild(document.createTextNode(report.signals[i].text));
      sigs.appendChild(row);
    }
    core.appendChild(sigs);
    const balance = section(parent, "优势与盲点", accent);
    balance.appendChild(h("p", "label", "你的闪光点"));
    bullets(balance, report.strengths);
    balance.appendChild(h("p", "label", "可以温柔对待的地方"));
    bullets(balance, report.blindspots);
    section(parent, "恋爱与人际", accent).appendChild(h("p", "", report.love));
    section(parent, "工作与学习", accent).appendChild(h("p", "", report.work));
    const matches = section(parent, "最合拍的组合", accent);
    const list = h("ul", "plain");
    for (let i = 0; i < report.matches.length; i += 1) {
      list.appendChild(h("li", "", report.matches[i].combo + "：" + report.matches[i].reason));
    }
    matches.appendChild(list);
    const hug = section(parent, "写给你", accent);
    hug.appendChild(h("p", "hug", "「" + report.hug + "」"));
  }
  parent.appendChild(h("p", "disclaimer", REPORT_DISCLAIMER));
}
