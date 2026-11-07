"""用 Pillow 生成小红书竖版分享图（1080×1440，3:4）。"""

from __future__ import annotations

import io
import logging
import os
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

log = logging.getLogger(__name__)

W, H = 1080, 1440
MARGIN = 88

PALETTES = {
    "火": {"top": "#FFE9DE", "bottom": "#FFD3DA", "accent": "#D9676A", "text": "#4A3236", "soft": "#F7B9B5"},
    "土": {"top": "#F6F0DF", "bottom": "#E2EBD3", "accent": "#7F9150", "text": "#3D3B2B", "soft": "#CFDDB0"},
    "风": {"top": "#ECEFFF", "bottom": "#F3E6FA", "accent": "#8572CC", "text": "#35324F", "soft": "#D3C8F2"},
    "水": {"top": "#E1F2F7", "bottom": "#DDE5FB", "accent": "#4A88B3", "text": "#2D3C4E", "soft": "#B8D4EC"},
}

FONT_DIR = Path(__file__).resolve().parent.parent / "fonts"

REGULAR_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/simhei.ttf",
]
BOLD_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "C:/Windows/Fonts/msyhbd.ttc",
]

NO_LINE_START = set("，。、！？；：,.!?;:）)」』》〉】…—～·%")


def _bundled(bold: bool) -> list[str]:
    if not FONT_DIR.is_dir():
        return []
    files = sorted(p for p in FONT_DIR.iterdir() if p.suffix.lower() in {".ttf", ".otf", ".ttc"})
    bolds = [str(p) for p in files if "bold" in p.name.lower()]
    regs = [str(p) for p in files if "bold" not in p.name.lower()]
    return bolds + regs if bold else regs + bolds


def _sc_index(path: str) -> int:
    """.ttc 里可能有日、韩、简、繁多个字体，优先挑简体中文那一个。"""
    if not path.lower().endswith(".ttc"):
        return 0
    for i in range(12):
        try:
            name = " ".join(ImageFont.truetype(path, 20, index=i).getname())
        except OSError:
            break
        if " SC" in name or "Simplified" in name or name.startswith("PingFang SC"):
            return i
    return 0


@lru_cache(maxsize=None)
def _font_path(bold: bool) -> tuple[str, int] | None:
    env = os.environ.get("CARD_FONT_BOLD" if bold else "CARD_FONT")
    candidates = ([env] if env else []) + _bundled(bold) + (BOLD_CANDIDATES if bold else []) + REGULAR_CANDIDATES
    for path in candidates:
        if path and os.path.exists(path):
            return path, _sc_index(path)
    return None


@lru_cache(maxsize=64)
def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    found = _font_path(bold)
    if found is None:
        log.warning("没有找到中文字体，分享图里的中文会显示成方块。请安装 fonts-noto-cjk 或在 fonts/ 放一个字体文件。")
        return ImageFont.load_default(size)
    path, index = found
    return ImageFont.truetype(path, size, index=index)


def has_cjk_font() -> bool:
    return _font_path(False) is not None


def _tokens(text: str) -> list[str]:
    """英文和数字连在一起算一个词，不在中间断行；中文逐字。"""
    out, buf = [], ""
    for ch in text:
        if ch.isascii() and (ch.isalnum() or ch in "×-'"):
            buf += ch
        else:
            if buf:
                out.append(buf)
                buf = ""
            out.append(ch)
    if buf:
        out.append(buf)
    return out


def wrap(text: str, f: ImageFont.FreeTypeFont, width: int, max_lines: int | None = None) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        line = ""
        for tok in _tokens(para):
            if f.getlength(line + tok) <= width or not line:
                line += tok
            elif tok in NO_LINE_START:
                line += tok  # 标点不放到行首，宁可这一行稍微挤一点
            else:
                lines.append(line)
                line = tok.lstrip()
        lines.append(line)
    if max_lines is not None and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while last and f.getlength(last + "…") > width:
            last = last[:-1]
        lines[-1] = last.rstrip("，。、；：,.;:") + "…"
    return lines


def _rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _gradient(top: str, bottom: str) -> Image.Image:
    t, b = _rgb(top), _rgb(bottom)
    col = Image.new("RGB", (1, H))
    for y in range(H):
        k = y / (H - 1)
        col.putpixel((0, y), tuple(round(t[i] + (b[i] - t[i]) * k) for i in range(3)))
    return col.resize((W, H))


def _decorate(d: ImageDraw.ImageDraw, pal: dict) -> None:
    soft = _rgb(pal["soft"])
    for (cx, cy, r, a) in ((960, 120, 260, 90), (90, 1300, 220, 70), (1010, 980, 120, 60)):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*soft, a))
    accent = _rgb(pal["accent"])
    for (x, y, s) in ((880, 300, 14), (960, 360, 8), (50, 650, 9), (1030, 1310, 10)):
        d.polygon([(x, y - s * 2), (x + s // 2, y - s // 2), (x + s * 2, y), (x + s // 2, y + s // 2),
                   (x, y + s * 2), (x - s // 2, y + s // 2), (x - s * 2, y), (x - s // 2, y - s // 2)],
                  fill=(*accent, 150))


def _panel(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    d.rounded_rectangle(box, radius=36, fill=(255, 255, 255, 190))


def _canvas(top: str, bottom: str, pal: dict) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = _gradient(top, bottom)
    d = ImageDraw.Draw(img, "RGBA")  # RGBA 模式：半透明的装饰和底板会和背景混合
    _decorate(d, pal)
    return img, d


def _chips(d: ImageDraw.ImageDraw, words: list[str], y: int, pal: dict) -> int:
    f = font(30)
    x = MARGIN
    for w in words:
        tw = int(f.getlength(w))
        box = (x, y, x + tw + 48, y + 58)
        if box[2] > W - MARGIN:
            break
        d.rounded_rectangle(box, radius=29, outline=pal["accent"], width=3, fill="#FFFFFF")
        d.text((x + 24, y + 29), w, font=f, fill=pal["accent"], anchor="lm")
        x = box[2] + 18
    return y + 58


def _footer(d: ImageDraw.ImageDraw, pal: dict, site: str | None) -> None:
    f = font(26)
    text = "由 AI 生成，仅供娱乐" + (f"  ·  {site}" if site else "")
    d.text((W // 2, H - 70), text, font=f, fill=(*_rgb(pal["text"]), 170), anchor="mm")


def _to_png(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


PANEL_TOP_PAD, PANEL_BOTTOM_PAD, PANEL_HEAD = 40, 44, 72
BODY_MAX_BOTTOM = H - 230


def _fit_paragraph(text: str, width: int, avail_h: int):
    """挑一个放得下的最大字号，字少时字大一点，画面不会空。"""
    for size in (40, 38, 36, 34, 32, 30):
        f, lh = font(size), int(size * 1.62)
        lines = wrap(text, f, width)
        if len(lines) * lh <= avail_h:
            return f, lh, lines
    f, lh = font(30), int(30 * 1.62)
    return f, lh, wrap(text, f, width, max_lines=max(1, avail_h // lh))


def _fit_bullets(items: list[str], width: int, avail_h: int, gap: int = 18):
    groups: list[list[str]] = []
    for size in (36, 34, 32, 30):
        f, lh = font(size), int(size * 1.56)
        groups = [wrap(i, f, width, max_lines=3) for i in items]
        if sum(len(g) for g in groups) * lh + gap * (len(groups) - 1) <= avail_h:
            return f, lh, groups
    while groups and sum(len(g) for g in groups) * lh + gap * (len(groups) - 1) > avail_h:
        groups.pop()
    return f, lh, groups


def _hug_and_footer(d: ImageDraw.ImageDraw, pal: dict, hug: str, panel_bottom: int, site: str | None) -> None:
    f = font(32)
    lines = wrap("「" + hug + "」", f, W - 2 * MARGIN, max_lines=2)
    line_h = 48
    area_top, area_bottom = panel_bottom, H - 110
    y = area_top + (area_bottom - area_top - line_h * len(lines)) // 2 + line_h // 2
    for line in lines:
        d.text((W // 2, y), line, font=f, fill=pal["accent"], anchor="mm")
        y += line_h
    _footer(d, pal, site)


def single_card(report: dict, site: str | None = None) -> bytes:
    pal = PALETTES[report["sign"]["element"]]
    img, d = _canvas(pal["top"], pal["bottom"], pal)
    inner = W - 2 * MARGIN

    y = 96
    d.text((MARGIN, y), "16 型人格 × 星座 · 温柔解读", font=font(30), fill=pal["accent"])
    y += 80
    d.text((MARGIN, y), report["label"], font=font(84, bold=True), fill=pal["text"])
    y += 120
    d.text((MARGIN, y), report["nickname"], font=font(58, bold=True), fill=pal["accent"])
    y += 96
    f = font(36)
    for line in wrap(report["one_liner"], f, inner, max_lines=3):
        d.text((MARGIN, y), line, font=f, fill=pal["text"])
        y += 54
    y += 22
    top = _chips(d, report["keywords"], y, pal) + 44

    text_top = top + PANEL_TOP_PAD + PANEL_HEAD
    f, lh, lines = _fit_paragraph(report["core"], inner - 24, BODY_MAX_BOTTOM - PANEL_BOTTOM_PAD - text_top)
    bottom = text_top + lh * len(lines) + PANEL_BOTTOM_PAD
    _panel(d, (MARGIN - 24, top, W - MARGIN + 24, bottom))
    d.text((MARGIN + 12, top + PANEL_TOP_PAD), "性格核心", font=font(36, bold=True), fill=pal["accent"])
    y = text_top
    for line in lines:
        d.text((MARGIN + 12, y), line, font=f, fill=pal["text"])
        y += lh

    _hug_and_footer(d, pal, report["hug"], bottom, site)
    return _to_png(img)


def pair_card(report: dict, site: str | None = None) -> bytes:
    pal = PALETTES[report["a"]["element"]]
    pal_b = PALETTES[report["b"]["element"]]
    img, d = _canvas(pal["top"], pal_b["bottom"], pal)
    inner = W - 2 * MARGIN

    y = 96
    d.text((MARGIN, y), "16 型人格 × 星座 · 双人配对", font=font(30), fill=pal["accent"])
    y += 84
    fb, fr = font(56, bold=True), font(34)
    for who, person, p in (("你", report["a"], pal), ("TA", report["b"], pal_b)):
        d.text((MARGIN, y + 8), who, font=fr, fill=p["accent"])
        d.text((MARGIN + 80, y), person["label"], font=fb, fill=pal["text"])
        y += 82
    y += 24
    d.text((MARGIN, y), report["title"], font=font(72, bold=True), fill=pal["accent"])
    y += 112

    # 默契指数
    cx, cy, r = W - MARGIN - 110, y - 150, 110
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill="#FFFFFF", outline=pal["accent"], width=6)
    d.text((cx, cy - 30), "默契指数", font=font(28), fill=pal["text"], anchor="mm")
    d.text((cx, cy + 28), str(report["score"]), font=font(76, bold=True), fill=pal["accent"], anchor="mm")

    f = font(36)
    for line in wrap(report["one_liner"], f, inner, max_lines=3):
        d.text((MARGIN, y), line, font=f, fill=pal["text"])
        y += 54
    top = y + 40

    gap = 18
    text_top = top + PANEL_TOP_PAD + PANEL_HEAD
    f, lh, groups = _fit_bullets(report["highlights"][:3], inner - 70, BODY_MAX_BOTTOM - PANEL_BOTTOM_PAD - text_top, gap)
    body_h = sum(len(g) for g in groups) * lh + gap * max(0, len(groups) - 1)
    bottom = text_top + body_h + PANEL_BOTTOM_PAD
    _panel(d, (MARGIN - 24, top, W - MARGIN + 24, bottom))
    d.text((MARGIN + 12, top + PANEL_TOP_PAD), "相处亮点", font=font(36, bold=True), fill=pal["accent"])
    y = text_top
    dot = f.size // 2
    for lines in groups:
        dy = (lh - dot) // 2
        d.ellipse((MARGIN + 14, y + dy, MARGIN + 14 + dot, y + dy + dot), fill=pal["accent"])
        for line in lines:
            d.text((MARGIN + 50, y), line, font=f, fill=pal["text"])
            y += lh
        y += gap

    _hug_and_footer(d, pal, report["hug"], bottom, site)
    return _to_png(img)
