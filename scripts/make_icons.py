"""生成网站标签页图标（原创）：python scripts/make_icons.py [A|B|C]，默认 A，写到 assets/icon.png。

A 粉紫渐变 + 白色月牙和星星；B 粉紫渐变 +「16」；C 深色夜空 + 金色月牙。
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageChops

S = 1024  # 先画大图再缩小，边缘更平滑
OUT = 256
PINK, LAV = (213, 139, 170), (133, 114, 204)
WHITE = (255, 255, 255, 255)


def gradient_square(c1, c2, radius=0.23):
    g = Image.new("RGBA", (S, S))
    px = g.load()
    for y in range(S):
        for x in range(S):
            t = (x + y) / (2 * S)  # 左上 → 右下
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)) + (255,)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius), fill=255)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(g, (0, 0), mask)
    return out


def crescent_mask(cx, cy, r, dx, dy, r2):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    cut = Image.new("L", (S, S), 0)
    ImageDraw.Draw(cut).ellipse([cx + dx - r2, cy + dy - r2, cx + dx + r2, cy + dy + r2], fill=255)
    return ImageChops.subtract(m, cut)


def sparkle(draw, cx, cy, r, fill=WHITE):
    """四角星：两个细长菱形叠起来。"""
    w = r * 0.28
    draw.polygon([(cx, cy - r), (cx + w, cy - w), (cx + r, cy), (cx + w, cy + w),
                  (cx, cy + r), (cx - w, cy + w), (cx - r, cy), (cx - w, cy - w)], fill=fill)


def icon_moon():
    im = gradient_square(PINK, LAV)
    white = Image.new("RGBA", (S, S), WHITE)
    im.paste(white, (0, 0), crescent_mask(int(S * 0.46), int(S * 0.54), int(S * 0.30), int(S * 0.15), int(S * -0.10), int(S * 0.26)))
    d = ImageDraw.Draw(im)
    sparkle(d, S * 0.72, S * 0.28, S * 0.12)
    sparkle(d, S * 0.80, S * 0.52, S * 0.05)
    return im


def icon_16():
    im = gradient_square(PINK, LAV)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(S * 0.50))
    box = d.textbbox((0, 0), "16", font=f)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((S - w) / 2 - box[0], (S - h) / 2 - box[1] + S * 0.04), "16", font=f, fill=WHITE)
    sparkle(d, S * 0.80, S * 0.20, S * 0.10)
    return im


def icon_night():
    im = gradient_square((70, 60, 110), (40, 36, 70))
    gold = Image.new("RGBA", (S, S), (255, 214, 150, 255))
    im.paste(gold, (0, 0), crescent_mask(int(S * 0.46), int(S * 0.54), int(S * 0.30), int(S * 0.15), int(S * -0.10), int(S * 0.26)))
    d = ImageDraw.Draw(im)
    sparkle(d, S * 0.72, S * 0.28, S * 0.12, fill=(244, 190, 214, 255))
    sparkle(d, S * 0.80, S * 0.52, S * 0.05, fill=(244, 190, 214, 255))
    return im


if __name__ == "__main__":
    choice = (sys.argv[1] if len(sys.argv) > 1 else "A").upper()
    im = {"A": icon_moon, "B": icon_16, "C": icon_night}[choice]()
    out = Path(__file__).resolve().parent.parent / "assets" / "icon.png"
    out.parent.mkdir(exist_ok=True)
    im.resize((OUT, OUT), Image.LANCZOS).save(out)
    print(f"已生成 {choice} → {out}")
