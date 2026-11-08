"""浅色 / 深色两套主题都要在 config.toml 里配齐，而且文字在背景上看得清。"""

from pathlib import Path

import pytest

tomllib = pytest.importorskip("tomllib")  # Python 3.11 起自带

CONFIG = Path(__file__).resolve().parent.parent / ".streamlit" / "config.toml"


def _luminance(hex_color: str) -> float:
    rgb = [int(hex_color.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    r, g, b = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    hi, lo = sorted((_luminance(a), _luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


@pytest.fixture(scope="module")
def theme() -> dict:
    return tomllib.loads(CONFIG.read_text(encoding="utf-8"))["theme"]


def test_both_themes_defined(theme):
    assert "base" not in theme  # 写了 base 就只剩一套主题，菜单里也不会出现切换
    for name in ("light", "dark"):
        assert {"primaryColor", "backgroundColor", "secondaryBackgroundColor", "textColor"} <= set(theme[name])


@pytest.mark.parametrize("name", ["light", "dark"])
def test_text_is_readable(theme, name):
    t = theme[name]
    assert contrast(t["textColor"], t["backgroundColor"]) >= 7
    assert contrast(t["textColor"], t["secondaryBackgroundColor"]) >= 7
    assert contrast(t["primaryColor"], t["backgroundColor"]) >= 2.5  # 标签页下划线、单选圈这些强调色


def test_dark_is_dark_and_light_is_light(theme):
    assert _luminance(theme["dark"]["backgroundColor"]) < 0.05 < _luminance(theme["light"]["backgroundColor"])
