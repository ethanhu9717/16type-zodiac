import { cuspNote, dateFromParts, makeBirthday, sunSign } from "./engine/astro.js";
import { TYPE_CODES, getSign, getType } from "./engine/knowledge.js";
import { person } from "./engine/pairing.js";
import { generatePair, generateSingle } from "./engine/report.js";
import { getBuildVersion, insetTop, isShortLayout, publishNote, readWindow, safeAreaBottomInset, saveImage, shareImage } from "./ui/bridge.js";
import { drawShare, pairCardSpec, renderShareDataUrl, singleCardSpec } from "./ui/card.js";
import { CAMP, THEMES, applyTheme, campId, currentTheme, elementKey } from "./ui/theme.js";
import { DIMENSIONS, GUIDE_NOTE, QUESTIONS, codeFromChoices } from "./ui/guide.js";
import { noteIssues, pairNote, singleNote } from "./ui/note.js";
import { renderFullReport } from "./ui/report-view.js";
import { signCollapsed, signReady } from "./ui/sign-flow.js";
import { typeCollapsed } from "./ui/type-flow.js";

const TYPE_GROUPS = ["nt", "nf", "sj", "sp"];

const SIGN_GROUPS = [
  { id: "fire", name: "火象", keys: ["白羊", "狮子", "射手"] },
  { id: "earth", name: "土象", keys: ["金牛", "处女", "摩羯"] },
  { id: "air", name: "风象", keys: ["双子", "天秤", "水瓶"] },
  { id: "water", name: "水象", keys: ["巨蟹", "天蝎", "双鱼"] },
];

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
  // Use a leap year only to validate month/day; no birth year is collected.
  // signInput only swaps the entry UI. A confirmed sign and saved month/day stay put.
  return { year: 2000, month: "", day: "", signKey: "", signFrom: "", signInput: "pick", signEditing: false, typeCode: "", typeEditing: false };
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

function birthdayResult(who) {
  if (who.month === "" || who.day === "") return { state: "empty" };
  const birthday = makeBirthday(who.year, Number(who.month), Number(who.day), today());
  if (!birthday.date) {
    return { state: "invalid", message: (birthday.message || "这个日期还不能用。").replace("2000 年 ", "") };
  }
  return { state: "ready", sign: sunSign(birthday.date), note: cuspNote(birthday.date) || "" };
}

function applyBirthday(who) {
  const result = birthdayResult(who);
  if (result.state === "ready") {
    who.signKey = result.sign.key;
    who.signFrom = "date";
  }
  return result;
}

function readPerson(who) {
  if (who.signInput === "date" && who.month !== "" && who.day !== "") {
    const result = applyBirthday(who);
    if (result.state === "invalid") return { error: result.message };
  } else if (!who.signKey && who.signInput === "date") {
    return { error: "先选好月和日。" };
  }
  if (!who.signKey) return { error: who.signInput === "date" ? "先选好月和日。" : "先选一个星座。" };
  if (who.choosing) return { error: "请先完成四项偏好选择。" };
  if (!who.typeCode) return { error: "先选一个 16 型人格，或用四项偏好自己选。" };
  return { sign: getSign(who.signKey), typeCode: who.typeCode };
}

function personBlocker(who, name) {
  if (who.signInput === "date" && who.month !== "" && who.day !== "") {
    const result = birthdayResult(who);
    if (result.state === "invalid") return result.message;
  }
  const whoText = name === "你" ? "你" : " TA ";
  if (!who.signKey) {
    if (who.signInput === "date") return "先为" + whoText + "选好月和日";
    return "先为" + whoText + "选一个星座";
  }
  if (who.choosing) return "先完成" + whoText + "的四项偏好";
  if (!who.typeCode) return "先为" + whoText + "选一个 16 型人格";
  return "";
}

function formBlocker() {
  const mine = personBlocker(state.me, "你");
  if (mine) return mine;
  if (state.mode === "pair") return personBlocker(state.them, "TA");
  return "";
}

function ctaLabel() {
  return state.mode === "pair" ? "✨ 解锁我们的双人图鉴" : "✨ 解锁我的专属人格图鉴";
}

let statusTimer;
function setStatus(text) {
  clearTimeout(statusTimer);
  const node = document.getElementById("status");
  if (node) {
    node.textContent = text || "";
    node.hidden = !text;
    if (text) statusTimer = setTimeout(function () { node.hidden = true; }, 5500);
  }
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
  const result = document.getElementById("result");
  if (result) document.body.classList.toggle("showing-result", !result.hidden);
}

function mount() {
  const app = document.getElementById("app");
  const hero = h("header", "hero");
  const topRow = h("div", "hero-top");
  const kicker = h("p", "kicker");
  kicker.appendChild(h("span", "moon"));
  kicker.appendChild(document.createTextNode("一点小确幸"));
  topRow.appendChild(kicker);
  topRow.appendChild(themeSwitch());
  hero.appendChild(topRow);
  hero.appendChild(h("h1", "top", "16 型人格 × 星座"));
  app.appendChild(hero);
  applyTheme(currentTheme().id);

  const switcher = h("div", "switcher");
  const thumb = h("span", "switcher-thumb");
  thumb.setAttribute("aria-hidden", "true");
  switcher.appendChild(modeButton("single", "我的解读"));
  switcher.appendChild(modeButton("pair", "双人配对"));
  switcher.appendChild(thumb);
  app.appendChild(switcher);

  const edit = h("div", "panel");
  edit.id = "edit";
  app.appendChild(edit);

  const result = h("div", "panel");
  result.id = "result";
  result.hidden = true;
  const head = h("div", "result-head");
  head.appendChild(h("p", "eyebrow", "属于你的性格手记"));
  head.appendChild(h("p", "combo-name"));
  head.appendChild(h("p", "summary"));
  const campLabel = h("p", "camp-label");
  campLabel.id = "camp-label";
  head.appendChild(campLabel);
  const intro = h("p", "result-intro");
  intro.id = "result-intro";
  head.appendChild(intro);
  const tags = h("div", "tags");
  tags.id = "result-tags";
  head.appendChild(tags);
  const frame = h("div", "card-frame");
  const canvas = document.createElement("canvas");
  canvas.id = "card";
  canvas.setAttribute("aria-label", "分享卡预览");
  frame.appendChild(canvas);
  const actions = h("div", "actions");
  actions.appendChild(actionButton("save", "保存到相册", onSave));
  const share = actionButton("share share-action", "分享图片", onShare);
  share.id = "share";
  actions.appendChild(share);
  const shareHint = h("p", "hint share-hint", "半屏里请用发布笔记或保存图片。");
  const back = h("button", "text-btn result-back", "修改选择");
  back.type = "button";
  back.addEventListener("click", function () {
    show("result", false);
    show("edit", true);
    bindGenerate();
    setStatus("");
  });
  const details = h("details", "report-details");
  details.appendChild(h("summary", "", "展开完整解读 ⌄"));
  const full = h("div", "full");
  full.id = "full";
  details.appendChild(full);
  details.addEventListener("toggle", function () {
    syncDetailsSummary();
  });
  result.appendChild(back);
  result.appendChild(frame);
  head.hidden = true;
  result.appendChild(head);
  result.appendChild(details);
  result.appendChild(actions);
  result.appendChild(shareHint);
  app.appendChild(result);
  arrangeResult();

  const status = h("p", "status");
  status.id = "status";
  status.hidden = true;
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  app.appendChild(status);

  const bar = h("div", "bar");
  const hint = h("p", "go-hint");
  hint.id = "go-hint";
  hint.hidden = true;
  bar.appendChild(hint);
  const go = h("button", "primary", ctaLabel());
  go.id = "go";
  go.type = "button";
  go.addEventListener("click", onGenerate);
  bar.appendChild(go);
  app.appendChild(bar);

  renderEdit();
  syncGo();
  bindKeyboard();
  bootPlatform();
}

function syncDetailsSummary() {
  const details = document.querySelector(".report-details");
  if (!details) return;
  const summary = details.querySelector("summary");
  if (!summary) return;
  summary.textContent = details.open ? "收起完整解读 ⌃" : "展开完整解读 ⌄";
}

function arrangeResult() {
  const result = document.getElementById("result");
  if (!result) return;
  const head = result.querySelector(".result-head");
  const frame = result.querySelector(".card-frame");
  const actions = result.querySelector(".actions");
  const hint = result.querySelector(".share-hint");
  const back = result.querySelector(".result-back");
  const details = result.querySelector(".report-details");
  const order = [back, frame, details, actions, hint, head];
  for (let i = 0; i < order.length; i += 1) result.appendChild(order[i]);
  head.hidden = true;
  back.textContent = "修改选择";
  syncDetailsSummary();
}

function themeSwitch() {
  const mood = h("div", "mood");
  mood.appendChild(h("p", "mood-label", "换个心情"));
  const row = h("div", "themes");
  row.setAttribute("role", "radiogroup");
  row.setAttribute("aria-label", "换个心情");
  for (let i = 0; i < THEMES.length; i += 1) {
    const theme = THEMES[i];
    const button = h("button", theme.id === currentTheme().id ? "theme on" : "theme");
    button.type = "button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", theme.name);
    button.setAttribute("aria-checked", theme.id === currentTheme().id ? "true" : "false");
    const dot = h("span", "theme-dot");
    dot.style.backgroundColor = theme.accent;
    button.appendChild(dot);
    button.addEventListener("click", function () {
      applyTheme(theme.id);
      const buttons = row.querySelectorAll(".theme");
      for (let n = 0; n < buttons.length; n += 1) {
        const on = buttons[n] === button;
        buttons[n].className = on ? "theme on" : "theme";
        buttons[n].setAttribute("aria-checked", on ? "true" : "false");
      }
      paintCard();
    });
    row.appendChild(button);
  }
  mood.appendChild(row);
  return mood;
}

function modeButton(mode, label) {
  const button = h("button", "mode" + (state.mode === mode ? " on" : ""));
  button.type = "button";
  if (mode === "pair") {
    button.appendChild(h("span", "mode-mark", "♡"));
    button.appendChild(document.createTextNode(label));
  } else {
    button.textContent = label;
  }
  button.addEventListener("click", function () {
    if (state.mode === mode) return;
    setStatus("");
    state.mode = mode;
    const buttons = document.querySelectorAll(".mode");
    for (let i = 0; i < buttons.length; i += 1) buttons[i].className = "mode";
    button.className = "mode on";
    const switcher = button.parentNode;
    if (switcher) switcher.className = mode === "pair" ? "switcher pair" : "switcher";
    const result = document.getElementById("result");
    if (result && !result.hidden) {
      show("result", false);
      show("edit", true);
      bindGenerate();
    }
    renderEdit();
    syncGo();
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
  fresh.disabled = false;
  const hint = document.getElementById("go-hint");
  if (hint) hint.hidden = true;
}

function syncGo() {
  const go = document.getElementById("go");
  const result = document.getElementById("result");
  if (!go || !result || !result.hidden) return;
  go.textContent = ctaLabel();
  const blocker = formBlocker();
  go.disabled = blocker !== "";
}

function bindGenerate() {
  const go = document.getElementById("go");
  const fresh = go.cloneNode(true);
  fresh.addEventListener("click", onGenerate);
  go.replaceWith(fresh);
  fresh.id = "go";
  syncGo();
}

function bindKeyboard() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const update = function () {
    const overlap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    const open = overlap > 140;
    document.body.classList.toggle("keyboard-open", open);
    document.documentElement.style.setProperty("--keyboard-inset", open ? overlap + "px" : "0px");
  };
  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
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
  edit.classList.remove("swap");
  void edit.offsetWidth;
  edit.classList.add("swap");
}

function stepHead(kicker, checked) {
  const head = h("div", "step-head");
  const title = h("p", "step-kicker", kicker);
  if (checked) title.appendChild(h("span", "step-check", "✓"));
  head.appendChild(title);
  return head;
}

function replacePerson(box, title, who, allowGuide) {
  const next = personBlock(title, who, allowGuide);
  box.replaceWith(next);
  syncGo();
  return next;
}

function textSymbol(symbol) {
  return symbol + "\uFE0E";
}

function syncSignCards(board, signKey) {
  const cards = board.querySelectorAll(".sign-card");
  for (let i = 0; i < cards.length; i += 1) {
    const on = signKey !== "" && cards[i].getAttribute("data-sign") === signKey;
    cards[i].className = on ? "sign-card on" : "sign-card";
    cards[i].setAttribute("aria-pressed", on ? "true" : "false");
  }
}

function signMethod(who, rerender) {
  const row = h("div", "method seg");
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", "星座输入方式");
  const pickOn = who.signInput !== "date";
  const pick = h("button", "method-btn" + (pickOn ? " on" : ""), "直接选择");
  pick.type = "button";
  pick.setAttribute("aria-pressed", pickOn ? "true" : "false");
  const dateOn = who.signInput === "date";
  const date = h("button", "method-btn" + (dateOn ? " on" : ""), "生日查询");
  date.type = "button";
  date.setAttribute("aria-pressed", dateOn ? "true" : "false");
  pick.addEventListener("click", function () {
    if (who.signInput !== "date") return;
    who.signInput = "pick";
    rerender();
  });
  date.addEventListener("click", function () {
    if (who.signInput === "date") return;
    who.signInput = "date";
    rerender();
  });
  row.appendChild(pick);
  row.appendChild(date);
  return row;
}

function signBoard(title, who, signNode, problemNode, onPick) {
  const board = h("div", "sign-board");
  board.setAttribute("role", "group");
  board.setAttribute("aria-label", title + "的星座");
  for (let g = 0; g < SIGN_GROUPS.length; g += 1) {
    const groupInfo = SIGN_GROUPS[g];
    const group = h("div", "sign-group");
    group.setAttribute("data-element", groupInfo.id);
    const label = h("p", "sign-group-label");
    label.appendChild(h("span", "element-dot"));
    label.appendChild(document.createTextNode(groupInfo.name));
    group.appendChild(label);
    const grid = h("div", "sign-grid");
    for (let i = 0; i < groupInfo.keys.length; i += 1) {
      const key = groupInfo.keys[i];
      const sign = getSign(key);
      const button = h("button", "sign-card" + (who.signKey === key ? " on" : ""));
      button.type = "button";
      button.setAttribute("data-element", groupInfo.id);
      button.setAttribute("data-sign", key);
      button.setAttribute("aria-pressed", who.signKey === key ? "true" : "false");
      button.appendChild(h("span", "sign-symbol", textSymbol(sign.symbol)));
      button.appendChild(h("span", "sign-name", sign.name));
      button.addEventListener("click", function () {
        who.signKey = key;
        who.signFrom = "pick";
        syncSignCards(board, who.signKey);
        refreshSign(who, signNode, problemNode);
        setStatus("");
        if (onPick) onPick();
      });
      grid.appendChild(button);
    }
    group.appendChild(grid);
    board.appendChild(group);
  }
  return board;
}

function signSummary(who, box, title, allowGuide) {
  const selected = getSign(who.signKey);
  const row = h("div", "sign-summary");
  row.setAttribute("data-element", elementKey(selected.element));
  const value = h("span", "sign-summary-value");
  value.appendChild(h("span", "sign-symbol", textSymbol(selected.symbol)));
  value.appendChild(h("span", "sign-name", selected.name));
  row.appendChild(value);
  const edit = h("button", "text-btn sign-edit", "修改");
  edit.type = "button";
  edit.addEventListener("click", function () {
    who.signEditing = true;
    replacePerson(box, title, who, allowGuide);
  });
  row.appendChild(edit);
  return row;
}

function typeSummary(who, box, title, allowGuide) {
  const type = getType(who.typeCode);
  const row = h("div", "type-summary");
  row.setAttribute("data-camp", campId(who.typeCode));
  const value = h("span", "type-summary-value");
  value.appendChild(h("span", "type-code", type.code));
  value.appendChild(h("span", "type-name", type.nickname));
  row.appendChild(value);
  const edit = h("button", "text-btn type-edit", "修改");
  edit.type = "button";
  edit.addEventListener("click", function () {
    who.typeEditing = true;
    replacePerson(box, title, who, allowGuide);
  });
  row.appendChild(edit);
  return row;
}

function personBlock(title, who, allowGuide) {
  if (who.signInput !== "date") who.signInput = "pick";
  const self = title === "关于你";
  const box = h("section", "card person");
  box.appendChild(h("h2", "", title));
  const collapsed = signCollapsed(who, applyBirthday);
  box.appendChild(stepHead(self ? "01 · 你的星座" : "01 · TA 的星座", collapsed));
  if (collapsed) {
    box.appendChild(signSummary(who, box, title, allowGuide));
  } else {
    const sign = h("p", "sign");
    const problem = h("p", "problem");
    box.appendChild(signMethod(who, function () { replacePerson(box, title, who, allowGuide); }));
    if (who.signInput === "date") {
      const row = h("div", "date-row");
      const onReady = function () {
        if (signReady(who, applyBirthday)) {
          who.signEditing = false;
          replacePerson(box, title, who, allowGuide);
          return true;
        }
        return false;
      };
      row.appendChild(numberSelect(who, "month", "月", 1, 12, onReady));
      row.appendChild(numberSelect(who, "day", "日", 1, 31, onReady));
      box.appendChild(row);
    } else {
      box.appendChild(signBoard(title, who, sign, problem, function () {
        who.signEditing = false;
        replacePerson(box, title, who, allowGuide);
      }));
    }
    box.appendChild(sign);
    box.appendChild(problem);
    refreshSign(who, sign, problem);
  }

  const typeFolded = typeCollapsed(who);
  box.appendChild(stepHead(self ? "02 · 你的 16 型人格" : "02 · TA 的 16 型人格", typeFolded));
  if (typeFolded) {
    box.appendChild(typeSummary(who, box, title, allowGuide));
    return box;
  }
  const picks = h("div", "picks seg");
  picks.setAttribute("role", "group");
  picks.setAttribute("aria-label", "性格选择方式");
  const direct = h("button", "chip on", "我知道类型");
  direct.type = "button";
  direct.setAttribute("aria-pressed", "true");
  const guide = h("button", "chip", "不太确定，帮我选");
  guide.type = "button";
  guide.setAttribute("aria-pressed", "false");
  picks.appendChild(direct);
  if (allowGuide) picks.appendChild(guide);
  box.appendChild(picks);

  const grid = h("div", "type-groups");
  for (let g = 0; g < TYPE_GROUPS.length; g += 1) {
    const camp = TYPE_GROUPS[g];
    const section = h("div", "type-group");
    section.setAttribute("data-camp", camp);
    const label = h("p", "type-group-label");
    label.appendChild(h("span", "camp-dot"));
    label.appendChild(document.createTextNode(CAMP[camp].name));
    section.appendChild(label);
    const types = h("div", "type-grid");
    for (let i = 0; i < TYPE_CODES.length; i += 1) {
      const code = TYPE_CODES[i];
      if (campId(code) !== camp) continue;
      const button = h("button", "type" + (who.typeCode === code ? " on" : ""));
      button.type = "button";
      button.setAttribute("data-camp", camp);
      button.appendChild(h("span", "type-code", code));
      button.appendChild(h("span", "type-name", getType(code).nickname));
      button.addEventListener("click", function () {
        who.typeCode = code;
        who.choosing = false;
        who.typeEditing = false;
        replacePerson(box, title, who, allowGuide);
        setStatus("");
      });
      button.setAttribute("aria-pressed", who.typeCode === code ? "true" : "false");
      types.appendChild(button);
    }
    section.appendChild(types);
    grid.appendChild(section);
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
    direct.setAttribute("aria-pressed", "false");
    guide.className = "chip on";
    guide.setAttribute("aria-pressed", "true");
    wizard.hidden = false;
    grid.hidden = true;
    renderWizard(wizard, who, grid, direct, guide);
    syncGo();
    setStatus("");
  });
  direct.addEventListener("click", function () {
    who.choosing = false;
    direct.className = "chip on";
    direct.setAttribute("aria-pressed", "true");
    guide.className = "chip";
    guide.setAttribute("aria-pressed", "false");
    wizard.hidden = true;
    grid.hidden = false;
    syncGo();
  });
  if (who.choosing) {
    direct.className = "chip";
    direct.setAttribute("aria-pressed", "false");
    guide.className = "chip on";
    guide.setAttribute("aria-pressed", "true");
    wizard.hidden = false;
    grid.hidden = true;
    renderWizard(wizard, who, grid, direct, guide);
  }
  return box;
}

function renderWizard(wizard, who, grid, direct, guide) {
  wizard.textContent = "";
  wizard.appendChild(h("p", "note", GUIDE_NOTE));
  const item = QUESTIONS[who.guideStep];
  wizard.appendChild(h("p", "progress", (who.guideStep + 1) + " / " + QUESTIONS.length));
  const track = h("div", "steps");
  track.setAttribute("aria-hidden", "true");
  for (let s = 0; s < DIMENSIONS.length; s += 1) {
    let name = "step-dot";
    if (s < item.dimIndex) name += " done";
    else if (s === item.dimIndex) name += " on";
    track.appendChild(h("span", name));
  }
  wizard.appendChild(track);
  wizard.appendChild(h("p", "prompt", item.prompt));
  for (let i = 0; i < item.options.length; i += 1) {
    const option = item.options[i];
    const button = h("button", "choice", option.text);
    button.type = "button";
    button.addEventListener("click", function () {
      who.choices[item.id] = option.letter;
      if (who.guideStep < QUESTIONS.length - 1) {
        who.guideStep += 1;
        renderWizard(wizard, who, grid, direct, guide);
        return;
      }
      who.typeCode = codeFromChoices(who.choices) || "";
      who.choosing = false;
      who.typeEditing = false;
      wizard.hidden = true;
      grid.hidden = false;
      const box = wizard.parentNode;
      const title = box.querySelector("h2").textContent;
      replacePerson(box, title, who, true);
      setStatus("已选择 " + who.typeCode + "，可以解锁图鉴了。");
    });
    wizard.appendChild(button);
  }
  if (who.guideStep > 0) {
    wizard.appendChild(actionButton("text-btn", "← 上一题", function () {
      who.guideStep -= 1;
      renderWizard(wizard, who, grid, direct, guide);
    }));
  }
}

function numberSelect(who, key, suffix, start, end, onReady) {
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
    setStatus("");
    if (onReady && onReady()) return;
    let card = select.parentNode;
    while (card && (!card.className || String(card.className).indexOf("person") === -1)) card = card.parentNode;
    if (!card) return;
    refreshSign(who, card.querySelector(".sign"), card.querySelector(".problem"));
  });
  select.addEventListener("focus", function () {
    setTimeout(function () {
      try { select.scrollIntoView(true); } catch (error) { /* keep the native picker usable */ }
    }, 280);
  });
  return select;
}

function setProblem(node, text, isError) {
  node.textContent = text || "";
  node.className = isError ? "problem is-error" : "problem";
}

function setSign(signNode, text, ready, elementName) {
  signNode.textContent = text;
  signNode.hidden = !text;
  signNode.className = ready ? "sign ready" : "sign";
  if (ready && elementName) signNode.setAttribute("data-element", elementKey(elementName));
  else signNode.removeAttribute("data-element");
}

function refreshSign(who, signNode, problemNode) {
  if (signNode && problemNode && who.signInput === "date") {
    const result = applyBirthday(who);
    if (result.state === "ready") {
      const sign = result.sign;
      setSign(signNode, sign.name + " ", true, sign.element);
      signNode.appendChild(h("span", "sign-inline", textSymbol(sign.symbol)));
      signNode.appendChild(document.createTextNode(" · " + sign.element + "象 · " + sign.modality + " · " + sign.dates));
      setProblem(problemNode, result.note, false);
    } else if (result.state === "invalid") {
      setSign(signNode, "", false);
      setProblem(problemNode, result.message, true);
    } else if (who.signKey) {
      const selected = getSign(who.signKey);
      setSign(signNode, selected.name + " · " + selected.element + "象", true, selected.element);
      setProblem(problemNode, "", false);
    } else {
      setSign(signNode, "", false);
      setProblem(problemNode, "", false);
    }
  } else if (signNode && problemNode && who.signKey) {
    const selected = getSign(who.signKey);
    setSign(signNode, selected.name + " · " + selected.element + "象", true, selected.element);
    setProblem(problemNode, "", false);
  } else if (signNode && problemNode) {
    setSign(signNode, "", false);
    setProblem(problemNode, "", false);
  }
  syncGo();
}

let generateBusy = false;
function onGenerate() {
  if (generateBusy) return;
  const me = readPerson(state.me);
  if (me.error) {
    setStatus(me.error);
    return;
  }
  let them = null;
  if (state.mode === "pair") {
    them = readPerson(state.them);
    if (them.error) {
      setStatus("关于 TA：" + them.error);
      return;
    }
  }
  generateBusy = true;
  const go = document.getElementById("go");
  if (go) go.disabled = true;
  try {
  if (state.mode === "pair") {
    const report = generatePair(person(me.typeCode, me.sign.key), person(them.typeCode, them.sign.key));
    state.kind = "pair";
    state.report = report;
    state.spec = pairCardSpec(report);
    state.note = pairNote(report);
    state.campText = CAMP[campId(me.typeCode)].name + " · " + CAMP[campId(them.typeCode)].name;
    state.comboText = report.a.label + "  ·  " + report.b.label;
    document.body.setAttribute("data-camp", campId(me.typeCode));
    document.body.setAttribute("data-element", elementKey(report.a.element));
  } else {
    const report = generateSingle(me.typeCode, me.sign.key);
    state.kind = "single";
    state.report = report;
    state.spec = singleCardSpec(report);
    state.note = singleNote(report);
    state.campText = CAMP[campId(me.typeCode)].name;
    state.comboText = report.label;
    document.body.setAttribute("data-camp", campId(me.typeCode));
    document.body.setAttribute("data-element", elementKey(report.sign.element));
  }
  if (noteIssues(state.note).length) {
    setStatus("笔记文案需要再检查一下。");
    return;
  }
  document.querySelector("#result .combo-name").textContent = state.comboText;
  document.getElementById("camp-label").textContent = state.campText;
  document.querySelector("#result .summary").textContent = state.kind === "pair"
    ? state.report.title + " · 娱乐配对指数 " + state.report.score
    : state.report.nickname;
  document.querySelector("#result .eyebrow").textContent = state.kind === "pair" ? "属于你们的相处手记" : "属于你的性格手记";
  document.getElementById("result-intro").textContent = state.report.one_liner;
  const tags = document.getElementById("result-tags");
  tags.textContent = "";
  (state.kind === "single" ? state.report.keywords.slice(0, 3) : [state.report.a.label, state.report.b.label]).forEach(function (text) { tags.appendChild(h("span", "tag", text)); });
  document.querySelector(".report-details").open = false;
  arrangeResult();
  paintCard();
  renderFullReport(document.getElementById("full"), { kind: state.kind, report: state.report });
  show("edit", false);
  show("result", true);
  setFooter("发布笔记", onPublish);
  setStatus("结果已生成。发布笔记会打开小红书的编辑页，不会直接发出。");
  window.scrollTo(0, 0);
  } finally {
    generateBusy = false;
    const result = document.getElementById("result");
    if (result && result.hidden) syncGo();
  }
}

async function onPublish() {
  const go = document.getElementById("go");
  go.disabled = true;
  const result = await publishNote(window.xhs, state.note, renderAttempt);
  setStatus(result.message);
  go.disabled = false;
}

let saveBusy = false;
async function onSave() {
  if (saveBusy) return;
  saveBusy = true;
  const button = document.querySelector(".save");
  button.disabled = true;
  setStatus("正在准备图片…");
  try {
    const result = await saveImage(window.xhs, state.buildVersion, renderAttempt);
    setStatus(result.message);
  } finally { saveBusy = false; button.disabled = false; }
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
