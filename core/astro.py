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


def all_sign_keys() -> tuple[str, ...]:
    return SIGN_KEYS
