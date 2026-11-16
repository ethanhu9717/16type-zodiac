const W = 1080;
const H = 1440;

const PALETTES = {
  火: { top: "#F7F0E9", bottom: "#F3E6D0", accent: "#8767A6", gold: "#D9B978", text: "#3F344A" },
  土: { top: "#F7F0E9", bottom: "#EFE0C4", accent: "#8767A6", gold: "#D9B978", text: "#3F344A" },
  风: { top: "#E8D9F2", bottom: "#F7F0E9", accent: "#8767A6", gold: "#D9B978", text: "#3F344A" },
  水: { top: "#F7F0E9", bottom: "#E8D9F2", accent: "#8767A6", gold: "#D9B978", text: "#3F344A" },
};

const FONT = "PingFang SC, Source Han Sans SC, Noto Sans CJK SC, Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Arial, sans-serif";

export function palette(element) {
  return PALETTES[element] || PALETTES["火"];
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
  if (maxLines != null && lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[kept.length - 1];
    while (last && measure(last + "…") > width) last = last.slice(0, -1);
    kept[kept.length - 1] = last + "…";
    return kept;
  }
  return lines;
}

export function cardCopy(spec) {
  if (spec.kind === "pair") {
    return {
      kicker: "16 型人格 × 星座",
      lines: [spec.aLabel, spec.bLabel, spec.title, "默契指数 " + spec.score],
      disclaimer: "仅供娱乐参考",
    };
  }
  return {
    kicker: "16 型人格 × 星座",
    lines: [spec.label, spec.nickname].concat(spec.keywords).concat([spec.oneLiner]),
    disclaimer: "仅供娱乐参考",
  };
}

export function singleCardSpec(report) {
  return {
    kind: "single",
    element: report.sign.element,
    label: report.label,
    nickname: report.nickname,
    keywords: report.keywords.slice(0, 4),
    oneLiner: report.one_liner,
  };
}

export function pairCardSpec(report) {
  return {
    kind: "pair",
    element: report.a.element,
    elementB: report.b.element,
    aLabel: "你  " + report.a.label,
    aNick: report.a.nickname,
    bLabel: "TA  " + report.b.label,
    bNick: report.b.nickname,
    title: report.title,
    score: report.score,
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

function paintBackground(ctx, top, bottom) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
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

export function drawShare(ctx, spec) {
  const pal = palette(spec.element);
  const palB = palette(spec.elementB || spec.element);
  paintBackground(ctx, pal.top, palB.bottom);
  ctx.fillStyle = pal.gold;
  ctx.globalAlpha = 0.9;
  paintCrescent(ctx, 910, 168, 78);
  paintStar(ctx, 820, 250, 10);
  paintStar(ctx, 760, 300, 6);
  paintStar(ctx, 150, 1240, 8);
  ctx.fillStyle = pal.accent;
  ctx.globalAlpha = 0.55;
  paintStar(ctx, 210, 1210, 5);
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = pal.gold;
  ctx.lineWidth = 2;
  roundRect(ctx, 40, 48, W - 80, H - 96, 48);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = pal.accent;
  ctx.font = font(32, false);
  ctx.fillText("16 型人格 × 星座", 88, 140);
  const copy = cardCopy(spec);
  ctx.fillStyle = pal.text;
  ctx.font = font(spec.kind === "pair" ? 54 : 68, true);
  let y = 250;
  const measure = function (text) {
    return ctx.measureText(text).width;
  };
  if (spec.kind === "pair") {
    const rows = [
      [spec.aLabel, 56],
      [spec.aNick, 36],
      [spec.bLabel, 56],
      [spec.bNick, 36],
    ];
    for (let i = 0; i < rows.length; i += 1) {
      ctx.font = font(rows[i][1], i % 2 === 0);
      ctx.fillStyle = i % 2 === 0 ? pal.text : pal.accent;
      ctx.fillText(rows[i][0], 88, y);
      y += i % 2 === 0 ? 78 : 64;
    }
    y += 20;
    ctx.fillStyle = pal.accent;
    ctx.font = font(72, true);
    ctx.fillText(spec.title, 88, y);
    y += 120;
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 6;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(860, y - 20, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.text;
    ctx.font = font(28, false);
    ctx.textAlign = "center";
    ctx.fillText("默契指数", 860, y - 30);
    ctx.fillStyle = pal.accent;
    ctx.font = font(72, true);
    ctx.fillText(String(spec.score), 860, y + 50);
    ctx.textAlign = "left";
  } else {
    ctx.fillText(spec.label, 88, y);
    y += 110;
    ctx.fillStyle = pal.accent;
    ctx.font = font(52, true);
    ctx.fillText(spec.nickname, 88, y);
    y += 90;
    ctx.font = font(32, false);
    let x = 88;
    for (let i = 0; i < spec.keywords.length; i += 1) {
      const word = spec.keywords[i];
      const tw = ctx.measureText(word).width;
      roundRect(ctx, x, y - 40, tw + 48, 64, 32);
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.fill();
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = pal.accent;
      ctx.fillText(word, x + 24, y);
      x += tw + 72;
    }
    y += 90;
    ctx.fillStyle = pal.text;
    ctx.font = font(40, false);
    const lines = wrapText(spec.oneLiner, measure, W - 176, 4);
    roundRect(ctx, 64, y - 70, W - 128, lines.length * 64 + 80, 36);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fill();
    ctx.fillStyle = pal.text;
    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillText(lines[i], 100, y);
      y += 64;
    }
  }
  ctx.fillStyle = pal.text;
  ctx.globalAlpha = 0.7;
  ctx.font = font(30, false);
  ctx.textAlign = "center";
  ctx.fillText(copy.disclaimer, W / 2, H - 80);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
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
