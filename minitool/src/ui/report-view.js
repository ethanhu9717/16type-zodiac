import { REPORT_DISCLAIMER } from "../engine/report.js";

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function pad2(value) {
  return value < 10 ? "0" + value : String(value);
}

function fullHead(parent, options) {
  const head = h("header", "report-head");
  head.appendChild(h("p", "report-kicker", options.kicker));
  if (options.identities) {
    const identities = h("div", "report-identities");
    for (let i = 0; i < options.identities.length; i += 1) {
      const row = h("p", "report-identity");
      row.appendChild(h("span", "report-role", options.identities[i].role));
      row.appendChild(h("span", "report-identity-label", options.identities[i].label));
      row.appendChild(h("span", "report-identity-nick", options.identities[i].nickname));
      identities.appendChild(row);
    }
    head.appendChild(identities);
  } else {
    head.appendChild(h("p", "report-combo", options.combo));
  }
  head.appendChild(h("h2", "report-title", options.title));
  if (options.score != null) {
    const score = h("p", "report-score");
    score.appendChild(h("span", "report-score-label", "娱乐配对指数"));
    score.appendChild(h("span", "report-score-value", String(options.score)));
    head.appendChild(score);
  }
  parent.appendChild(head);
}

function chapter(parent, number, title) {
  const section = h("section", "report-chapter");
  const head = h("header", "chapter-head");
  head.appendChild(h("p", "chapter-kicker", "CHAPTER " + pad2(number)));
  const heading = h("h2", "chapter-title");
  heading.appendChild(h("span", "chapter-number", pad2(number)));
  heading.appendChild(document.createTextNode(" · " + title));
  head.appendChild(heading);
  section.appendChild(head);
  parent.appendChild(section);
  return section;
}

function copy(parent, text, className) {
  const node = h("p", className ? className + " report-copy" : "report-copy", text);
  parent.appendChild(node);
  return node;
}

function bullets(parent, items) {
  const list = h("ul", "plain");
  for (let i = 0; i < items.length; i += 1) list.appendChild(h("li", "", items[i]));
  parent.appendChild(list);
}

function signalList(parent, signals) {
  const box = h("div", "signals");
  for (let i = 0; i < signals.length; i += 1) {
    const kind = signals[i].kind === "印证" ? "✦ 两种特质的交汇点" : signals[i].kind;
    const row = h("div", "signal");
    row.setAttribute("data-kind", signals[i].kind);
    row.appendChild(h("p", "signal-kind", kind));
    row.appendChild(h("p", "signal-text", signals[i].text));
    box.appendChild(row);
  }
  parent.appendChild(box);
}

function appearsIn(text, sources) {
  const value = String(text || "").trim();
  if (!value) return true;
  for (let i = 0; i < sources.length; i += 1) {
    if (String(sources[i] || "").indexOf(value) !== -1) return true;
  }
  return false;
}

function keepLine(parent, text) {
  const value = String(text || "").trim();
  if (!value) return;
  const box = h("aside", "report-keep");
  box.appendChild(h("p", "keep-label", "✦ 值得记住的一句话"));
  box.appendChild(h("p", "keep-text", value));
  parent.appendChild(box);
}

export function renderFullReport(parent, model) {
  parent.textContent = "";
  const report = model.report;
  if (model.kind === "pair") {
    fullHead(parent, {
      kicker: "完整相处解读",
      title: report.title,
      score: report.score,
      identities: [
        { role: "你", label: report.a.label, nickname: report.a.nickname },
        { role: "TA", label: report.b.label, nickname: report.b.nickname },
      ],
    });
    const chemistry = chapter(parent, 1, "你们的化学反应");
    copy(chemistry, report.chemistry);
    const highlights = chapter(parent, 2, "相处亮点");
    bullets(highlights, report.highlights);
    const friction = chapter(parent, 3, "可能的小摩擦");
    const list = h("ul", "plain");
    for (let i = 0; i < report.frictions.length; i += 1) {
      const item = h("li", "");
      item.appendChild(h("b", "", report.frictions[i].point));
      item.appendChild(h("p", "tip", "小建议：" + report.frictions[i].tip));
      list.appendChild(item);
    }
    friction.appendChild(list);
    const date = chapter(parent, 4, "适合你们的相处方式");
    copy(date, report.date_idea);
    const hug = chapter(parent, 5, "写给你们");
    hug.appendChild(h("p", "hug", "「" + report.hug + "」"));
  } else {
    fullHead(parent, {
      kicker: "完整人格解读",
      combo: report.label,
      title: report.nickname,
    });
    const core = chapter(parent, 1, "性格核心");
    copy(core, report.core);
    const signalTexts = report.signals.map(function (item) { return item.text; });
    const matchTexts = report.matches.map(function (item) { return item.combo + "：" + item.reason; });
    const bodyTexts = [report.nickname, report.core, report.love, report.work, report.hug]
      .concat(signalTexts, report.strengths, report.blindspots, matchTexts);
    if (!appearsIn(report.one_liner, bodyTexts)) {
      keepLine(core, report.one_liner);
    }
    signalList(core, report.signals);
    const balance = chapter(parent, 2, "优势与盲点");
    balance.appendChild(h("p", "label", "你的闪光点"));
    bullets(balance, report.strengths);
    balance.appendChild(h("p", "label", "可以温柔对待的地方"));
    bullets(balance, report.blindspots);
    const love = chapter(parent, 3, "恋爱与人际");
    copy(love, report.love);
    const work = chapter(parent, 4, "工作与学习");
    copy(work, report.work);
    const matches = chapter(parent, 5, "可以探索的组合");
    const list = h("ul", "plain");
    for (let i = 0; i < report.matches.length; i += 1) {
      list.appendChild(h("li", "", report.matches[i].combo + "：" + report.matches[i].reason));
    }
    matches.appendChild(list);
    const hug = chapter(parent, 6, "写给你");
    hug.appendChild(h("p", "hug", "「" + report.hug + "」"));
  }
  parent.appendChild(h("p", "disclaimer report-disclaimer", REPORT_DISCLAIMER));
}
