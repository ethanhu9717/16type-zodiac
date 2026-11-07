"""读取 data/ 下的资料文件。"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

TYPE_CODES = (
    "INTJ", "INTP", "ENTJ", "ENTP",
    "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ",
    "ISTP", "ISFP", "ESTP", "ESFP",
)

# 黄道顺序，key 与 lunar-python 的 getXingZuo() 返回值一致
SIGN_KEYS = ("白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼")


def _load(name: str) -> dict:
    with open(DATA_DIR / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=None)
def types() -> dict:
    return _load("types")


@lru_cache(maxsize=None)
def signs() -> dict:
    return _load("signs")


@lru_cache(maxsize=None)
def rules() -> dict:
    return _load("rules")


@lru_cache(maxsize=None)
def quiz_items() -> list:
    return _load("oejts_zh")


def get_type(code: str) -> dict:
    code = code.upper()
    if code not in types():
        raise KeyError(f"未知的类型：{code}")
    return {"code": code, **types()[code]}


def get_sign(key: str) -> dict:
    key = key.replace("座", "")
    if key not in signs():
        raise KeyError(f"未知的星座：{key}")
    return {"key": key, **signs()[key]}
