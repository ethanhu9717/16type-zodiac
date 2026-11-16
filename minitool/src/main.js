import { cuspNote, dateFromParts, makeBirthday, sunSign } from "./engine/astro.js";
import { TYPE_CODES, getType } from "./engine/knowledge.js";
import { person } from "./engine/pairing.js";
import { generatePair, generateSingle } from "./engine/report.js";
import { getBuildVersion, insetTop, isShortLayout, publishNote, readWindow, safeAreaBottomInset, saveImage, shareImage } from "./ui/bridge.js";
import { drawShare, pairCardSpec, renderShareDataUrl, singleCardSpec } from "./ui/card.js";
import { DIMENSIONS, GUIDE_NOTE, codeFromChoices } from "./ui/guide.js";
import { noteIssues, pairNote, singleNote } from "./ui/note.js";
import { renderFullReport } from "./ui/report-view.js";

const state = {
  mode: "single",
  me: blank(),
  them: blank(),
  spec: null,
  note: null,
  report: null,
  kind: "single",
  buildVersion: 0,
};

function blank() {
  return { year: 1990, month: "", day: "", typeCode: "" };
}

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function today() {
  const now = new Date();
  return dateFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function readPerson(who) {
  if (who.month === "" || who.day === "") return { error: "先选好月和日。" };
  const birthday = makeBirthday(who.year, Number(who.month), Number(who.day), today());
  if (!birthday.date) return { error: birthday.message || "这个日期还不能用。" };
  if (!who.typeCode) return { error: "先选一个 16 型人格，或用四项偏好自己选。" };
  return { date: birthday.date, sign: sunSign(birthday.date), typeCode: who.typeCode };
}

function setStatus(text) {
  const node = document.getElementById("status");
  if (node) node.textContent = text || "";
}

function renderAttempt(options) {
  return renderShareDataUrl(state.spec, options);
}

function paintCard() {
  const canvas = document.getElementById("card");
  if (!canvas || !state.spec) return;
  canvas.width = 1080;
  canvas.height = 1440;
  drawShare(canvas.getContext("2d"), state.spec);
}

function show(id, on) {
  const node = document.getElementById(id);
  if (node) node.hidden = !on;
}

function mount() {
  const app = document.getElementById("app");
  const hero = h("header", "hero");
  const kicker = h("p", "kicker");
  kicker.appendChild(h("span", "moon"));
  kicker.appendChild(document.createTextNode("写给自己的小卡片"));
  hero.appendChild(kicker);
  hero.appendChild(h("h1", "top", "16 型人格 × 星座"));
  hero.appendChild(h("p", "lede", "选一个生日，配上性格，收成一张好看的卡片。只供娱乐，适合收藏，也适合发给在意的人。"));
  app.appendChild(hero);

  const switcher = h("div", "switcher");
  switcher.appendChild(modeButton("single", "我的解读"));
  switcher.appendChild(modeButton("pair", "双人配对"));
  app.appendChild(switcher);

  const edit = h("div", "panel");
  edit.id = "edit";
  app.appendChild(edit);

  const result = h("div", "panel");
  result.id = "result";
  result.hidden = true;
  result.appendChild(h("p", "summary"));
  const frame = h("div", "card-frame");
  const canvas = document.createElement("canvas");
  canvas.id = "card";
  canvas.setAttribute("aria-label", "分享卡预览");
  frame.appendChild(canvas);
  result.appendChild(frame);
  const actions = h("div", "actions");
  actions.appendChild(actionButton("save", "保存到相册", onSave));
  const share = actionButton("share share-action", "分享图片", onShare);
  share.id = "share";
  actions.appendChild(share);
  result.appendChild(actions);
  result.appendChild(h("p", "hint share-hint", "半屏里请用发布笔记或保存图片。"));
  const back = h("button", "text-btn", "返回修改");
  back.type = "button";
  back.addEventListener("click", function () {
    show("result", false);
    show("edit", true);
    setFooter("生成结果", onGenerate);
    setStatus("");
  });
  result.appendChild(back);
  const full = h("div", "full");
  full.id = "full";
  result.appendChild(full);
  app.appendChild(result);

  const status = h("p", "status");
  status.id = "status";
  app.appendChild(status);

  const bar = h("div", "bar");
  const go = h("button", "primary", "生成结果");
  go.id = "go";
  go.type = "button";
  go.addEventListener("click", onGenerate);
  bar.appendChild(go);
  app.appendChild(bar);

  renderEdit();
  bootPlatform();
}

function modeButton(mode, label) {
  const button = h("button", "mode" + (state.mode === mode ? " on" : ""), label);
  button.type = "button";
  button.addEventListener("click", function () {
    state.mode = mode;
    const buttons = document.querySelectorAll(".mode");
    for (let i = 0; i < buttons.length; i += 1) buttons[i].className = "mode";
    button.className = "mode on";
    if (!document.getElementById("result").hidden) {
      show("result", false);
      show("edit", true);
      setFooter("生成结果", onGenerate);
    }
    renderEdit();
  });
  return button;
}

function setFooter(label, handler) {
  const go = document.getElementById("go");
  go.textContent = label;
  const fresh = go.cloneNode(true);
  fresh.addEventListener("click", handler);
  go.replaceWith(fresh);
  fresh.id = "go";
}

function actionButton(className, label, handler) {
  const button = h("button", className, label);
  button.type = "button";
  button.addEventListener("click", handler);
  return button;
}

function renderEdit() {
  const edit = document.getElementById("edit");
  edit.textContent = "";
  edit.appendChild(personBlock("关于你", state.me, true));
  if (state.mode === "pair") edit.appendChild(personBlock("关于 TA", state.them, true));
}

function personBlock(title, who, allowGuide) {
  const box = h("section", "card person");
  box.appendChild(h("h2", "", title));
  const row = h("div", "date-row");
  row.appendChild(yearSelect(who));
  row.appendChild(numberSelect(who, "month", "月", 1, 12));
  row.appendChild(numberSelect(who, "day", "日", 1, 31));
  box.appendChild(row);
  const sign = h("p", "sign");
  box.appendChild(sign);
  const problem = h("p", "problem");
  box.appendChild(problem);
  refreshSign(who, sign, problem);

  box.appendChild(h("p", "label", "你的性格"));
  const picks = h("div", "picks");
  const direct = h("button", "chip on", "我知道类型");
  direct.type = "button";
  const guide = h("button", "chip", "不太确定，帮我选");
  guide.type = "button";
  picks.appendChild(direct);
  if (allowGuide) picks.appendChild(guide);
  box.appendChild(picks);

  const grid = h("div", "type-grid");
  for (let i = 0; i < TYPE_CODES.length; i += 1) {
    const code = TYPE_CODES[i];
    const button = h("button", "type" + (who.typeCode === code ? " on" : ""));
    button.type = "button";
    button.appendChild(h("span", "type-code", code));
    button.appendChild(h("span", "type-name", getType(code).nickname));
    button.addEventListener("click", function () {
      who.typeCode = code;
      who.choosing = false;
      renderEdit();
    });
    grid.appendChild(button);
  }
  box.appendChild(grid);

  const wizard = h("div", "wizard");
  wizard.hidden = true;
  box.appendChild(wizard);
  guide.addEventListener("click", function () {
    who.choosing = true;
    who.guideStep = 0;
    who.choices = {};
    direct.className = "chip";
    guide.className = "chip on";
    wizard.hidden = false;
    grid.hidden = true;
    renderWizard(wizard, who, grid, direct, guide);
  });
  direct.addEventListener("click", function () {
    who.choosing = false;
    direct.className = "chip on";
    guide.className = "chip";
    wizard.hidden = true;
    grid.hidden = false;
  });
  return box;
}

function renderWizard(wizard, who, grid, direct, guide) {
  wizard.textContent = "";
  wizard.appendChild(h("p", "note", GUIDE_NOTE));
  const dim = DIMENSIONS[who.guideStep];
  wizard.appendChild(h("p", "progress", (who.guideStep + 1) + " / " + DIMENSIONS.length));
  wizard.appendChild(h("p", "prompt", dim.prompt));
  for (let i = 0; i < dim.options.length; i += 1) {
    const option = dim.options[i];
    const button = h("button", "choice", option.text);
    button.type = "button";
    button.addEventListener("click", function () {
      who.choices[dim.id] = option.letter;
      if (who.guideStep < DIMENSIONS.length - 1) {
        who.guideStep += 1;
        renderWizard(wizard, who, grid, direct, guide);
        return;
      }
      who.typeCode = codeFromChoices(who.choices) || "";
      who.choosing = false;
      wizard.hidden = true;
      grid.hidden = false;
      renderEdit();
    });
    wizard.appendChild(button);
  }
}

function yearSelect(who) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", "年");
  const end = new Date().getFullYear();
  for (let year = end; year >= 1940; year -= 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = year + " 年";
    if (year === who.year) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener("change", function () {
    who.year = Number(select.value);
    refreshSign(who, select.parentNode.parentNode.querySelector(".sign"), select.parentNode.parentNode.querySelector(".problem"));
  });
  return select;
}

function numberSelect(who, key, suffix, start, end) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", suffix);
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = suffix;
  select.appendChild(empty);
  for (let n = start; n <= end; n += 1) {
    const option = document.createElement("option");
    option.value = String(n);
    option.textContent = n + " " + suffix;
    if (String(n) === String(who[key])) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener("change", function () {
    who[key] = select.value;
    const card = select.parentNode.parentNode;
    refreshSign(who, card.querySelector(".sign"), card.querySelector(".problem"));
  });
  return select;
}

function setSign(signNode, text, ready) {
  signNode.textContent = text;
  signNode.className = ready ? "sign ready" : "sign";
}

function refreshSign(who, signNode, problemNode) {
  if (who.month === "" || who.day === "") {
    setSign(signNode, "选好月和日，这里会出现你的星座。", false);
    problemNode.textContent = "";
    return;
  }
  const birthday = makeBirthday(who.year, Number(who.month), Number(who.day), today());
  if (!birthday.date) {
    setSign(signNode, "", false);
    problemNode.textContent = birthday.message || "";
    return;
  }
  const sign = sunSign(birthday.date);
  setSign(signNode, sign.name + " " + sign.symbol + " · " + sign.element + "象 · " + sign.modality + " · " + sign.dates, true);
  const note = cuspNote(birthday.date);
  problemNode.textContent = note || "";
}

function onGenerate() {
  const me = readPerson(state.me);
  if (me.error) {
    setStatus(me.error);
    return;
  }
  if (state.mode === "pair") {
    const them = readPerson(state.them);
    if (them.error) {
      setStatus(them.error.replace("先选", "先为 TA 选"));
      return;
    }
    const report = generatePair(person(me.typeCode, me.sign.key), person(them.typeCode, them.sign.key));
    state.kind = "pair";
    state.report = report;
    state.spec = pairCardSpec(report);
    state.note = pairNote(report);
    document.body.setAttribute("data-element", report.a.element);
  } else {
    const report = generateSingle(me.typeCode, me.sign.key);
    state.kind = "single";
    state.report = report;
    state.spec = singleCardSpec(report);
    state.note = singleNote(report);
    document.body.setAttribute("data-element", report.sign.element);
  }
  if (noteIssues(state.note).length) {
    setStatus("笔记文案需要再检查一下。");
    return;
  }
  document.querySelector("#result .summary").textContent = state.kind === "pair"
    ? state.report.title + " · 默契指数 " + state.report.score
    : state.report.nickname;
  paintCard();
  renderFullReport(document.getElementById("full"), { kind: state.kind, report: state.report });
  show("edit", false);
  show("result", true);
  setFooter("发布笔记", onPublish);
  setStatus("结果已生成。发布笔记会打开小红书的编辑页，不会直接发出。");
  window.scrollTo(0, 0);
}

async function onPublish() {
  const go = document.getElementById("go");
  go.disabled = true;
  const result = await publishNote(window.xhs, state.note, renderAttempt);
  setStatus(result.message);
  go.disabled = false;
}

async function onSave() {
  const result = await saveImage(window.xhs, state.buildVersion, renderAttempt);
  setStatus(result.message);
}

let shareBusy = false;

async function onShare() {
  if (shareBusy) return;
  const button = document.getElementById("share");
  shareBusy = true;
  if (button) button.disabled = true;
  try {
    const result = await shareImage(window.xhs, state.buildVersion, renderAttempt);
    if (result.state === "half") document.body.classList.add("layout-short");
    setStatus(result.message);
  } finally {
    shareBusy = false;
    const current = document.getElementById("share");
    if (current) current.disabled = false;
  }
}

async function bootPlatform() {
  state.buildVersion = await getBuildVersion(window.xhs);
  const info = await readWindow(window.xhs, state.buildVersion);
  if (!info) return;
  document.documentElement.style.setProperty("--safe-area-inset-top", insetTop(info) + "px");
  document.documentElement.style.setProperty("--safe-area-inset-bottom", safeAreaBottomInset(info) + "px");
  if (isShortLayout(info)) document.body.classList.add("layout-short");
}

if (typeof document !== "undefined") mount();
