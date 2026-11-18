import { CAMP, ELEMENTS, campId, currentTheme, elementKey } from "./theme.js";

const W = 1080;
const H = 1440;

const FONT = "PingFang SC, Source Han Sans SC, Noto Sans CJK SC, Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Arial, sans-serif";
const SIGN_FONT = "\"Songti SC\", \"STSong\", \"Times New Roman\", serif";

// A single fine frame keeps the card collectible without stacking borders.
const CARD = { x: 34, y: 34, w: 1012, h: 1372, r: 28 };
const FRAME = { x: 62, y: 62, w: 956, h: 1316, r: 20 };
const ART = { cx: 884, cy: 264, r: 84 };
const FOOTER_RULE = 1306;
const FOOTER_BASELINE = 1350;
const CARD_DISCLAIMER = "仅供娱乐参考";
const CLOSING_PUNCT = "，。！？；：、）》」』】〕〉”’…—,.!?;:%)]}";
const OPENING_PUNCT = "（《「『【〔〈“‘([{";

const SIGN_SYMBOLS = {
  "白羊": "♈", "金牛": "♉", "双子": "♊", "巨蟹": "♋",
  "狮子": "♌", "处女": "♍", "天秤": "♎", "天蝎": "♏",
  "射手": "♐", "摩羯": "♑", "水瓶": "♒", "双鱼": "♓",
};

// Line-art paths adapted from Tabler Icons (MIT), 24 × 24 grid.
// Copyright (c) 2020-2024 Paweł Kuna. Permission is granted under the MIT License.
// Drawing SVG path data through Path2D keeps the zodiac marks crisp in exports.
const ZODIAC_LINE_ART = {
  "白羊": ["M12 5a5 5 0 1 0 -4 8", "M16 13a5 5 0 1 0 -4 -8", "M12 21l0 -16"],
  "金牛": ["M6 3a6 6 0 0 0 12 0", "M6 15a6 6 0 1 0 12 0a6 6 0 1 0 -12 0"],
  "双子": ["M3 3a21 21 0 0 0 18 0", "M3 21a21 21 0 0 1 18 0", "M7 4.5l0 15", "M17 4.5l0 15"],
  "巨蟹": ["M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "M15 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "M3 12a10 6.5 0 0 1 14 -6.5", "M21 12a10 6.5 0 0 1 -14 6.5"],
  "狮子": ["M13 17a4 4 0 1 0 8 0", "M3 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "M7 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M7 7c0 3 2 5 2 9", "M15 7c0 4 -2 6 -2 10"],
  "处女": ["M3 4a2 2 0 0 1 2 2v9", "M5 6a2 2 0 0 1 4 0v9", "M9 6a2 2 0 0 1 4 0v10a7 5 0 0 0 7 5", "M12 21a7 5 0 0 0 7 -5v-2a3 3 0 0 0 -6 0"],
  "天秤": ["M5 20l14 0", "M5 17h5v-.3a7 7 0 1 1 4 0v.3h5"],
  "天蝎": ["M3 4a2 2 0 0 1 2 2v9", "M5 6a2 2 0 0 1 4 0v9", "M9 6a2 2 0 0 1 4 0v10a3 3 0 0 0 3 3h5l-3 -3m0 6l3 -3"],
  "射手": ["M4 20l16 -16", "M13 4h7v7", "M6.5 12.5l5 5"],
  "摩羯": ["M4 4a3 3 0 0 1 3 3v9", "M7 7a3 3 0 0 1 6 0v11a3 3 0 0 1 -3 3", "M13 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"],
  "水瓶": ["M3 10l3 -3l3 3l3 -3l3 3l3 -3l3 3", "M3 17l3 -3l3 3l3 -3l3 3l3 -3l3 3"],
  "双鱼": ["M5 3a21 21 0 0 1 0 18", "M19 3a21 21 0 0 0 0 18", "M5 12l14 0"],
};

function normalizeSignKey(signKey) {
  return String(signKey || "").replace(/\s|座/g, "");
}

// Exposed for the share-card layout checks; unknown keys fall back to null.
export function zodiacArtPaths(signKey) {
  return ZODIAC_LINE_ART[normalizeSignKey(signKey)] || null;
}

export function palette() {
  const theme = currentTheme();
  return {
    top: theme.paper,
    bottom: theme.paperBottom,
    accent: theme.cardAccent,
    gold: theme.cardGold,
    text: theme.cardInk,
    muted: theme.cardMuted,
    line: theme.cardLine,
    frame: theme.cardFrame,
    soft: theme.cardSoft,
    panel: theme.cardPanel,
  };
}

function tokens(text) {
  const out = [];
  let buf = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const code = ch.charCodeAt(0);
    if (code < 128 && /[A-Za-z0-9\-]/.test(ch)) buf += ch;
    else {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      out.push(ch);
    }
  }
  if (buf) out.push(buf);
  return out;
}

function tidyLineBreaks(lines) {
  // Keep closing punctuation with the text it belongs to instead of starting a line.
  for (let i = 1; i < lines.length; i += 1) {
    while (lines[i] && lines[i - 1] && CLOSING_PUNCT.indexOf(lines[i][0]) !== -1) {
      lines[i - 1] += lines[i][0];
      lines[i] = lines[i].slice(1);
    }
    if (!lines[i]) {
      lines.splice(i, 1);
      i -= 1;
    }
  }
  // Never leave an opening bracket or quote dangling at the end of a line.
  for (let i = 0; i < lines.length - 1; i += 1) {
    while (lines[i] && OPENING_PUNCT.indexOf(lines[i][lines[i].length - 1]) !== -1) {
      const mark = lines[i].slice(-1);
      lines[i] = lines[i].slice(0, -1);
      lines[i + 1] = mark + lines[i + 1];
    }
  }
  return lines.filter(function (line) { return line.length > 0; });
}

export function wrapText(text, measure, width, maxLines) {
  const lines = [];
  const parts = String(text).split("\n");
  for (let p = 0; p < parts.length; p += 1) {
    let line = "";
    const words = tokens(parts[p]);
    for (let i = 0; i < words.length; i += 1) {
      const tok = words[i];
      if (measure(line + tok) <= width || !line) line += tok;
      else {
        lines.push(line);
        line = tok;
      }
    }
    lines.push(line);
  }
  const tidied = tidyLineBreaks(lines);
  if (maxLines != null && tidied.length > maxLines) {
    const kept = tidied.slice(0, maxLines);
    let last = kept[kept.length - 1];
    while (last && measure(last + "…") > width) last = last.slice(0, -1);
    kept[kept.length - 1] = last + "…";
    return kept;
  }
  return tidied;
}

export function cardCopy(spec) {
  if (spec.kind === "pair") {
    return {
      kicker: "16 型人格 × 星座",
      lines: [spec.aLabel, spec.bLabel, spec.title, "娱乐配对指数 " + spec.score, spec.highlight, spec.tip, spec.hug || ""],
      disclaimer: CARD_DISCLAIMER,
    };
  }
  return {
    kicker: "16 型人格 × 星座",
    lines: [spec.label, spec.nickname].concat(spec.keywords).concat([spec.oneLiner, spec.hug]),
    disclaimer: CARD_DISCLAIMER,
  };
}

export function singleCardSpec(report) {
  const signName = report.sign.name;
  const signKey = normalizeSignKey(report.sign_key || signName);
  return {
    kind: "single",
    element: report.sign.element,
    label: report.label,
    nickname: report.nickname,
    keywords: report.keywords.slice(0, 4),
    oneLiner: report.one_liner,
    typeCode: report.type_code,
    camp: campId(report.type_code),
    signKey,
    signName,
    signSymbol: report.sign.symbol || SIGN_SYMBOLS[signKey] || "✦",
    hug: report.hug,
  };
}

function pairPerson(part) {
  const pieces = String(part.label || "").split("×");
  return {
    typeCode: (pieces[0] || "").trim(),
    signName: (pieces[1] || "").trim(),
    signKey: normalizeSignKey(pieces[1] || ""),
  };
}

export function pairCardSpec(report) {
  const a = pairPerson(report.a);
  const b = pairPerson(report.b);
  return {
    kind: "pair",
    element: report.a.element,
    elementB: report.b.element,
    camp: campId(a.typeCode),
    campB: campId(b.typeCode),
    aLabel: "你  " + report.a.label,
    aType: a.typeCode,
    aSignKey: a.signKey,
    aSignName: a.signName,
    aSignSymbol: report.a.symbol || SIGN_SYMBOLS[a.signKey] || "✦",
    aNick: report.a.nickname,
    bLabel: "TA  " + report.b.label,
    bType: b.typeCode,
    bSignKey: b.signKey,
    bSignName: b.signName,
    bSignSymbol: report.b.symbol || SIGN_SYMBOLS[b.signKey] || "✦",
    bNick: report.b.nickname,
    title: report.title,
    score: report.score,
    highlight: report.highlights[0],
    tip: report.frictions[0].tip,
    hug: report.hug || "",
  };
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function tint(hex, alpha) {
  const raw = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(raw)) return hex;
  const expanded = raw.length === 3 ? raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2] : raw;
  const value = parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

function paintBackground(ctx, top, bottom) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

function paintGrain(ctx, alpha) {
  // A quiet paper surface: fixed grain keeps exports deterministic.
  ctx.fillStyle = "rgba(48, 39, 65, " + alpha + ")";
  let seed = 41;
  for (let i = 0; i < 6500; i += 1) {
    seed = (seed * 16807) % 2147483647;
    const x = seed % W;
    seed = (seed * 16807) % 2147483647;
    ctx.fillRect(x, seed % H, 1.2, 1.2);
  }
}

function font(size, bold) {
  return (bold ? "700 " : "400 ") + size + "px " + FONT;
}

function paintCrescent(ctx, cx, cy, radius) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI * 0.32, Math.PI * 1.68, false);
  ctx.arc(cx + radius * 0.4, cy - radius * 0.06, radius * 0.76, Math.PI * 1.52, Math.PI * 0.48, true);
  ctx.closePath();
  ctx.fill();
}

function paintStar(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x + radius * 0.26, y - radius * 0.26);
  ctx.lineTo(x + radius, y);
  ctx.lineTo(x + radius * 0.26, y + radius * 0.26);
  ctx.lineTo(x, y + radius);
  ctx.lineTo(x - radius * 0.26, y + radius * 0.26);
  ctx.lineTo(x - radius, y);
  ctx.lineTo(x - radius * 0.26, y - radius * 0.26);
  ctx.closePath();
  ctx.fill();
}

function paintHeart(ctx, cx, cy, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.72);
  ctx.bezierCurveTo(cx - size * 1.2, cy - size * 0.08, cx - size * 0.58, cy - size * 0.96, cx, cy - size * 0.28);
  ctx.bezierCurveTo(cx + size * 0.58, cy - size * 0.96, cx + size * 1.2, cy - size * 0.08, cx, cy + size * 0.72);
  ctx.closePath();
  ctx.fill();
}

function fitted(ctx, text, x, y, size, width, color, bold) {
  ctx.fillStyle = color;
  let actual = size;
  ctx.font = font(actual, bold);
  while (ctx.measureText(text).width > width && actual > 24) {
    actual -= 1;
    ctx.font = font(actual, bold);
  }
  ctx.fillText(text, x, y);
}

function campVisual(id) {
  return CAMP[id] || CAMP.nt;
}

function elementVisual(name) {
  return ELEMENTS[elementKey(name)] || ELEMENTS.water;
}

function fitLineBlock(ctx, text, width, maxSize, minSize, maxLines) {
  let size = maxSize;
  let lines = [];
  while (size >= minSize) {
    ctx.font = font(size, false);
    lines = wrapText(text, function (value) { return ctx.measureText(value).width; }, width);
    let fits = lines.length <= maxLines;
    for (let i = 0; fits && i < lines.length; i += 1) {
      if (ctx.measureText(lines[i]).width > width + 0.5) fits = false;
    }
    if (fits) break;
    size -= 1;
  }
  if (size < minSize) {
    size = minSize;
    ctx.font = font(size, false);
    lines = wrapText(text, function (value) { return ctx.measureText(value).width; }, width);
  }
  return { size, leading: Math.round(size * 1.56), lines };
}

export function paintZodiacLineArt(ctx, signKey, cx, cy, size, color) {
  const paths = zodiacArtPaths(signKey);
  if (!paths) return false;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.55;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  try {
    for (let i = 0; i < paths.length; i += 1) ctx.stroke(new Path2D(paths[i]));
  } catch (error) {
    ctx.restore();
    return false;
  }
  ctx.restore();
  return true;
}

function paintZodiacSeal(ctx, options) {
  const pal = options.pal;
  const element = elementVisual(options.element);
  const cx = options.cx;
  const cy = options.cy;
  const r = options.r;
  const haloPad = options.haloPad || 0;

  if (haloPad > 0) {
    const halo = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r + haloPad);
    halo.addColorStop(0, tint(pal.soft, 0.92));
    halo.addColorStop(0.62, tint(pal.soft, 0.46));
    halo.addColorStop(1, tint(pal.soft, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r + haloPad, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = tint(pal.soft, 0.72);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = tint(pal.accent, 0.38);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  if (options.dashed) {
    ctx.strokeStyle = tint(element.color, 0.36);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, r - 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const painted = paintZodiacLineArt(ctx, options.signKey, cx, cy, options.artSize, pal.accent);
  if (!painted) {
    ctx.textAlign = "center";
    ctx.fillStyle = element.color;
    ctx.font = Math.round(r * 0.9) + "px " + SIGN_FONT;
    ctx.fillText(options.symbol || "", cx, cy + r * 0.28);
    ctx.textAlign = "left";
  }

  if (options.stars) {
    ctx.fillStyle = tint(pal.gold, 0.82);
    paintStar(ctx, cx - 78, cy - 58, 4.2);
    ctx.fillStyle = tint(element.color, 0.72);
    paintStar(ctx, cx + 82, cy + 44, 5);
    paintStar(ctx, cx + 57, cy - 68, 3);
    ctx.fillStyle = tint(pal.accent, 0.42);
    paintStar(ctx, cx - 52, cy + 70, 2.6);
  }
}

function paintZodiacMedallion(ctx, spec, pal) {
  paintZodiacSeal(ctx, {
    pal,
    signKey: normalizeSignKey(spec.signKey || spec.signName),
    symbol: spec.signSymbol,
    element: spec.element,
    cx: ART.cx,
    cy: ART.cy,
    r: ART.r,
    artSize: 104,
    haloPad: 66,
    dashed: true,
    stars: true,
  });
}

function paintCardBase(ctx) {
  const pal = palette();
  paintBackground(ctx, pal.top, pal.bottom);
  paintGrain(ctx, 0.035);

  ctx.save();
  ctx.shadowColor = tint(pal.text, 0.1);
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = currentTheme().card;
  roundRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);
  ctx.fill();
  ctx.restore();

  // Two very light washes give the paper depth without a busy gradient.
  ctx.save();
  roundRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);
  ctx.clip();
  const upperGlow = ctx.createRadialGradient(930, 210, 20, 930, 210, 430);
  upperGlow.addColorStop(0, tint(pal.soft, 0.42));
  upperGlow.addColorStop(1, tint(pal.soft, 0));
  ctx.fillStyle = upperGlow;
  ctx.fillRect(CARD.x, CARD.y, CARD.w, CARD.h);
  const lowerGlow = ctx.createRadialGradient(150, 1230, 30, 150, 1230, 430);
  lowerGlow.addColorStop(0, tint(pal.gold, 0.055));
  lowerGlow.addColorStop(1, tint(pal.gold, 0));
  ctx.fillStyle = lowerGlow;
  ctx.fillRect(CARD.x, CARD.y, CARD.w, CARD.h);
  ctx.restore();

  ctx.strokeStyle = tint(pal.frame, 0.95);
  ctx.lineWidth = 1.3;
  roundRect(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, FRAME.r);
  ctx.stroke();

  ctx.fillStyle = tint(pal.gold, 0.62);
  paintStar(ctx, 540, FRAME.y, 3.2);
  paintStar(ctx, 540, FRAME.y + FRAME.h, 2.6);
}

function paintBrand(ctx, pal) {
  ctx.fillStyle = pal.gold;
  paintCrescent(ctx, 103, 105, 11);

  fitted(ctx, "一点小确幸", 127, 114, 25, 170, pal.text, false);

  ctx.strokeStyle = tint(pal.line, 0.9);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(278, 96);
  ctx.lineTo(278, 126);
  ctx.stroke();

  fitted(ctx, "16 型人格 × 星座", 300, 114, 22, 260, pal.muted, false);

  ctx.fillStyle = tint(pal.gold, 0.58);
  paintStar(ctx, 512, 108, 3.2);

  ctx.strokeStyle = tint(pal.line, 0.68);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(96, 154);
  ctx.lineTo(984, 154);
  ctx.stroke();
}

function paintIdentity(ctx, spec, pal) {
  const element = elementVisual(spec.element);
  const camp = campVisual(spec.camp);

  ctx.fillStyle = tint(pal.accent, 0.5);
  roundRect(ctx, 96, 303, 32, 3, 1.5);
  ctx.fill();
  fitted(ctx, "写给自己的性格手记", 144, 315, 22, 300, pal.muted, false);

  fitted(ctx, spec.typeCode, 96, 462, 154, 650, pal.text, true);

  fitted(ctx, "×", 96, 526, 32, 34, pal.muted, false);
  const symbol = (spec.signSymbol || SIGN_SYMBOLS[normalizeSignKey(spec.signKey)] || "") + "\uFE0E";
  ctx.fillStyle = element.color;
  ctx.font = "46px " + SIGN_FONT;
  ctx.fillText(symbol, 138, 531);
  const symbolWidth = ctx.measureText(symbol).width;
  const nameX = 138 + symbolWidth + 14;
  fitted(ctx, spec.signName, nameX, 530, 40, 500, pal.accent, true);

  ctx.font = font(40, true);
  const signWidth = ctx.measureText(spec.signName).width;
  ctx.fillStyle = tint(pal.gold, 0.72);
  paintStar(ctx, nameX + Math.min(signWidth, 500) + 14, 518, 3.4);

  ctx.fillStyle = tint(pal.gold, 0.72);
  roundRect(ctx, 96, 583, 30, 2.5, 1.25);
  ctx.fill();
  fitted(ctx, spec.nickname, 96, 626, 56, 888, pal.text, true);

  let tagSize = 26;
  let pad = 18;
  let gap = 12;
  const tagH = 46;
  const tagTop = 664;
  ctx.font = font(tagSize, false);
  const widths = spec.keywords.map(function (keyword) {
    return ctx.measureText(keyword).width + pad * 2;
  });
  let total = widths.reduce(function (sum, value) { return sum + value; }, 0) + gap * (widths.length - 1);
  if (total > 888) {
    tagSize = 24;
    pad = 15;
    gap = 10;
    ctx.font = font(tagSize, false);
    for (let i = 0; i < widths.length; i += 1) widths[i] = ctx.measureText(spec.keywords[i]).width + pad * 2;
    total = widths.reduce(function (sum, value) { return sum + value; }, 0) + gap * (widths.length - 1);
  }

  let x = 96;
  for (let i = 0; i < spec.keywords.length; i += 1) {
    const width = widths[i];
    ctx.fillStyle = tint(pal.soft, 0.7);
    roundRect(ctx, x, tagTop, width, tagH, tagH / 2);
    ctx.fill();
    ctx.strokeStyle = tint(camp.color, 0.2);
    ctx.lineWidth = 1;
    roundRect(ctx, x, tagTop, width, tagH, tagH / 2);
    ctx.stroke();
    fitted(ctx, spec.keywords[i], x + pad, tagTop + 32, tagSize, width - pad * 2, pal.text, false);
    x += width + gap;
  }
}

export function singleCardLayout(ctx, spec) {
  const pal = palette();
  const one = fitLineBlock(ctx, spec.oneLiner, 848, 36, 30, 2);
  const onePanel = {
    x: 76,
    y: 746,
    w: 928,
    r: 20,
    titleY: 746 + 52,
    bodyX: 112,
    bodyY: 746 + 112,
    size: one.size,
    leading: one.leading,
    lines: one.lines,
  };
  onePanel.h = 112 + one.lines.length * one.leading + 20;

  const hugTop = onePanel.y + onePanel.h + 28;
  const hug = fitLineBlock(ctx, spec.hug, 810, 34, 28, 2);
  const hugPanel = {
    x: 76,
    y: hugTop,
    w: 928,
    r: 22,
    titleY: hugTop + 52,
    bodyX: 112,
    bodyY: hugTop + 110,
    size: hug.size,
    leading: hug.leading,
    lines: hug.lines,
  };
  hugPanel.h = 110 + hug.lines.length * hug.leading + 20;

  return {
    pal,
    onePanel,
    hugPanel,
    footerRule: FOOTER_RULE,
    footerBaseline: FOOTER_BASELINE,
  };
}

export function pairCardLayout(ctx, spec) {
  const pal = palette();
  const top = 700;
  const highlight = fitLineBlock(ctx, spec.highlight, 380, 27, 24, 4);
  const tip = fitLineBlock(ctx, spec.tip, 380, 27, 24, 4);
  const leading = Math.max(highlight.leading, tip.leading);
  const lineCount = Math.max(highlight.lines.length, tip.lines.length);
  const panelH = 104 + lineCount * leading + 12;

  const highlightPanel = {
    x: 96,
    y: top,
    w: 432,
    r: 20,
    titleX: 126,
    titleY: top + 48,
    bodyX: 126,
    bodyY: top + 100,
    size: highlight.size,
    leading: highlight.leading,
    lines: highlight.lines,
    title: "01 / 相处亮点",
    h: panelH,
  };
  const tipPanel = {
    x: 552,
    y: top,
    w: 432,
    r: 20,
    titleX: 582,
    titleY: top + 48,
    bodyX: 582,
    bodyY: top + 100,
    size: tip.size,
    leading: tip.leading,
    lines: tip.lines,
    title: "02 / 给你们的小建议",
    h: panelH,
  };

  const hugTop = top + panelH + 46;
  const hug = fitLineBlock(ctx, spec.hug || "", 832, 30, 26, 3);
  const hugPanel = {
    x: 96,
    y: hugTop,
    w: 888,
    r: 22,
    titleY: hugTop + 52,
    bodyX: 128,
    bodyY: hugTop + 112,
    size: hug.size,
    leading: hug.leading,
    lines: hug.lines,
    title: "留一句话给你们",
  };
  hugPanel.h = Math.max(230, 112 + hug.lines.length * hug.leading + 24);

  return {
    pal,
    highlightPanel,
    tipPanel,
    hugPanel,
    footerRule: FOOTER_RULE,
    footerBaseline: FOOTER_BASELINE,
  };
}

function paintInfoPanel(ctx, panel, pal) {
  ctx.fillStyle = pal.panel;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
  ctx.fill();

  ctx.fillStyle = tint(pal.accent, 0.5);
  roundRect(ctx, panel.x + 4, panel.y + 32, 4, panel.h - 64, 2);
  ctx.fill();

  fitted(ctx, panel.title || "你的独特之处", panel.titleX || (panel.x + 38), panel.titleY, 26, 300, pal.accent, true);

  ctx.fillStyle = tint(pal.gold, 0.58);
  paintStar(ctx, panel.x + panel.w - 28, panel.y + 27, 3.6);

  ctx.fillStyle = pal.text;
  ctx.font = font(panel.size, false);
  for (let i = 0; i < panel.lines.length; i += 1) {
    ctx.fillText(panel.lines[i], panel.bodyX, panel.bodyY + i * panel.leading);
  }
}

function paintHugPanel(ctx, panel, pal) {
  const fill = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
  fill.addColorStop(0, tint(pal.soft, 0.86));
  fill.addColorStop(0.62, tint(pal.panel, 0.94));
  fill.addColorStop(1, tint(pal.soft, 0.5));
  ctx.fillStyle = fill;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
  ctx.fill();

  ctx.strokeStyle = tint(pal.accent, 0.14);
  ctx.lineWidth = 1;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
  ctx.stroke();

  paintHeart(ctx, panel.x + 36, panel.titleY - 8, 8.5, pal.accent);
  const hugTitle = panel.title || "留一句话给自己";
  fitted(ctx, hugTitle, panel.x + 58, panel.titleY, 26, 330, pal.accent, true);

  ctx.font = font(26, true);
  const titleWidth = ctx.measureText(hugTitle).width;
  ctx.strokeStyle = tint(pal.accent, 0.18);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panel.x + 58 + titleWidth + 18, panel.titleY - 9);
  ctx.lineTo(panel.x + panel.w - 42, panel.titleY - 9);
  ctx.stroke();

  ctx.fillStyle = tint(pal.gold, 0.6);
  paintStar(ctx, panel.x + panel.w - 30, panel.y + 28, 3.4);

  ctx.fillStyle = pal.text;
  ctx.font = font(panel.size, false);
  for (let i = 0; i < panel.lines.length; i += 1) {
    ctx.fillText(panel.lines[i], panel.bodyX, panel.bodyY + i * panel.leading);
  }

  ctx.fillStyle = tint(pal.accent, 0.08);
  ctx.font = "118px " + SIGN_FONT;
  ctx.textAlign = "right";
  ctx.fillText("”", panel.x + panel.w - 18, panel.y + panel.h - 20);
  ctx.textAlign = "left";
}

function paintFooter(ctx, layout) {
  const pal = layout.pal;
  ctx.strokeStyle = tint(pal.line, 0.78);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(96, layout.footerRule);
  ctx.lineTo(984, layout.footerRule);
  ctx.stroke();

  fitted(ctx, "性格有很多面，允许自己慢慢展开。", 96, layout.footerBaseline, 22, 650, pal.muted, false);
  ctx.textAlign = "right";
  fitted(ctx, CARD_DISCLAIMER, 984, layout.footerBaseline, 22, 220, pal.muted, false);
  ctx.textAlign = "left";
}

function paintPairSeals(ctx, spec, pal) {
  const seals = [
    { cx: 856, cy: 194, signKey: spec.aSignKey, symbol: spec.aSignSymbol, element: spec.element },
    { cx: 944, cy: 194, signKey: spec.bSignKey, symbol: spec.bSignSymbol, element: spec.elementB },
  ];
  for (let i = 0; i < seals.length; i += 1) {
    paintZodiacSeal(ctx, {
      pal,
      signKey: seals[i].signKey,
      symbol: seals[i].symbol,
      element: seals[i].element,
      cx: seals[i].cx,
      cy: seals[i].cy,
      r: 35,
      artSize: 46,
      haloPad: 10,
    });
  }
}

function paintPairScore(ctx, spec, pal) {
  const x = 780;
  const y = 240;
  const w = 204;
  const h = 100;
  const fill = ctx.createLinearGradient(x, y, x + w, y + h);
  fill.addColorStop(0, tint(pal.soft, 0.9));
  fill.addColorStop(1, tint(pal.panel, 0.96));
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, 26);
  ctx.fill();
  ctx.strokeStyle = tint(pal.accent, 0.18);
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 26);
  ctx.stroke();

  ctx.fillStyle = tint(pal.gold, 0.62);
  paintStar(ctx, x + w - 22, y + 18, 3.2);

  fitted(ctx, "娱乐配对指数", x + 22, y + 30, 18, w - 44, pal.muted, false);
  fitted(ctx, String(spec.score), x + 22, y + 84, 54, w - 44, pal.accent, true);
}

function paintPairHeading(ctx, spec, pal) {
  ctx.fillStyle = tint(pal.accent, 0.5);
  roundRect(ctx, 96, 202, 32, 3, 1.5);
  ctx.fill();
  fitted(ctx, "写给两个人的相处手记", 144, 214, 22, 360, pal.muted, false);

  fitted(ctx, spec.title, 96, 288, 66, 640, pal.text, true);
  fitted(ctx, "在不同里，找到靠近彼此的方式", 96, 336, 24, 640, pal.muted, false);

  paintPairSeals(ctx, spec, pal);
  paintPairScore(ctx, spec, pal);
}

function paintPairPeople(ctx, spec, pal) {
  const cols = [
    {
      x: 96,
      tag: "你",
      typeCode: spec.aType,
      signKey: spec.aSignKey,
      signName: spec.aSignName,
      symbol: spec.aSignSymbol,
      nickname: spec.aNick,
      element: spec.element,
      camp: campVisual(spec.camp),
    },
    {
      x: 552,
      tag: "TA",
      typeCode: spec.bType,
      signKey: spec.bSignKey,
      signName: spec.bSignName,
      symbol: spec.bSignSymbol,
      nickname: spec.bNick,
      element: spec.elementB || spec.element,
      camp: campVisual(spec.campB || spec.camp),
    },
  ];

  for (let i = 0; i < cols.length; i += 1) {
    const col = cols[i];
    ctx.fillStyle = tint(pal.soft, 0.82);
    roundRect(ctx, col.x, 378, 58, 28, 14);
    ctx.fill();
    ctx.strokeStyle = tint(col.camp.color, 0.22);
    ctx.lineWidth = 1;
    roundRect(ctx, col.x, 378, 58, 28, 14);
    ctx.stroke();
    ctx.fillStyle = col.camp.color;
    ctx.beginPath();
    ctx.arc(col.x + 16, 392, 3.2, 0, Math.PI * 2);
    ctx.fill();
    fitted(ctx, col.tag, col.x + 26, 398, 18, 26, pal.muted, false);

    fitted(ctx, col.typeCode, col.x, 492, 84, 420, pal.text, true);

    ctx.fillStyle = pal.muted;
    ctx.font = font(24, false);
    ctx.fillText("×", col.x, 540);
    const symbol = (col.symbol || SIGN_SYMBOLS[col.signKey] || "") + "\uFE0E";
    ctx.font = "34px " + SIGN_FONT;
    ctx.fillStyle = elementVisual(col.element).color;
    ctx.fillText(symbol, col.x + 34, 541);
    const symbolWidth = ctx.measureText(symbol).width;
    const nameX = col.x + 34 + symbolWidth + 12;
    fitted(ctx, col.signName, nameX, 540, 32, 360, pal.accent, true);
    ctx.font = font(32, true);
    const nameWidth = ctx.measureText(col.signName).width;
    ctx.fillStyle = tint(pal.gold, 0.72);
    paintStar(ctx, nameX + nameWidth + 12, 529, 3.2);

    fitted(ctx, col.nickname, col.x, 594, 34, 420, pal.text, true);
  }

  ctx.strokeStyle = tint(pal.line, 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(540, 376);
  ctx.lineTo(540, 620);
  ctx.stroke();
  ctx.fillStyle = tint(pal.gold, 0.72);
  paintStar(ctx, 540, 498, 3.6);

  ctx.strokeStyle = tint(pal.line, 0.68);
  ctx.beginPath();
  ctx.moveTo(96, 636);
  ctx.lineTo(984, 636);
  ctx.stroke();
}

function drawSingleShare(ctx, spec) {
  const layout = singleCardLayout(ctx, spec);
  paintCardBase(ctx);
  paintBrand(ctx, layout.pal);
  paintZodiacMedallion(ctx, spec, layout.pal);
  paintIdentity(ctx, spec, layout.pal);
  paintInfoPanel(ctx, layout.onePanel, layout.pal);
  paintHugPanel(ctx, layout.hugPanel, layout.pal);
  paintFooter(ctx, layout);
}

function drawPairShare(ctx, spec) {
  const layout = pairCardLayout(ctx, spec);
  paintCardBase(ctx);
  paintBrand(ctx, layout.pal);
  paintPairHeading(ctx, spec, layout.pal);
  paintPairPeople(ctx, spec, layout.pal);
  paintInfoPanel(ctx, layout.highlightPanel, layout.pal);
  paintInfoPanel(ctx, layout.tipPanel, layout.pal);
  paintHugPanel(ctx, layout.hugPanel, layout.pal);
  paintFooter(ctx, layout);
}

export function drawShare(ctx, spec) {
  if (spec.kind === "pair") {
    drawPairShare(ctx, spec);
    return;
  }
  drawSingleShare(ctx, spec);
}

export function renderShareDataUrl(spec, options) {
  const scale = options && options.scale ? options.scale : 1;
  const mime = options && options.mime ? options.mime : "image/png";
  const quality = options && options.quality ? options.quality : 0.92;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  drawShare(ctx, spec);
  return canvas.toDataURL(mime, quality);
}
