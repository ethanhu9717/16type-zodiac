"""生日 → 太阳星座。"""

from __future__ import annotations

import datetime as dt

from lunar_python import Solar

from .knowledge import SIGN_KEYS, get_sign


def sun_sign_key(date: dt.date) -> str:
    """返回星座 key，比如「双鱼」。日期界线用 lunar-python 的固定表（3.21 白羊 … 2.19 双鱼）。"""
    return Solar.fromYmd(date.year, date.month, date.day).getXingZuo()


def sun_sign(date: dt.date) -> dict:
    return get_sign(sun_sign_key(date))


def cusp_note(date: dt.date) -> str | None:
    """生日在星座交界前后一天时，给一句提示：交界日每年可能差一天，另一个星座也可以参考。"""
    here = sun_sign_key(date)
    for delta in (-1, 1):
        other = sun_sign_key(date + dt.timedelta(days=delta))
        if other != here:
            other_name = get_sign(other)["name"]
            return f"你的生日在星座交界附近，每年的交界日可能差一天，也可以看看{other_name}的解读。"
    return None


def make_birthday(year: int, month: int | None, day: int | None, today: dt.date | None = None) -> tuple[dt.date | None, str | None]:
    """年 / 月 / 日三个下拉框 → 日期。还没选完返回 (None, None)；日期不存在或在未来时返回 (None, 提示)。"""
    if month is None or day is None:
        return None, None
    try:
        date = dt.date(year, month, day)
    except ValueError:
        return None, f"{year} 年 {month} 月没有 {day} 日，换一天吧。"
    if date > (today or dt.date.today()):
        return None, "这一天还没到哦，再看看年份？"
    return date, None


def all_sign_keys() -> tuple[str, ...]:
    return SIGN_KEYS
