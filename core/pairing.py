"""双人配对：两个人的「类型 × 星座」→ 默契指数和配对资料包。

分数只用来排序和展示一个温和的「默契指数」（66–98），不做「合不合适」的判断。
"""

from __future__ import annotations

from dataclasses import dataclass

from .knowledge import SIGN_KEYS, TYPE_CODES, get_sign, get_type, rules

ELEMENT_ORDER = ("火", "土", "风", "水")

SCORE_MIN, SCORE_MAX = 66, 98


@dataclass(frozen=True)
class Person:
    type_code: str
    sign_key: str

    @property
    def label(self) -> str:
        return f"{self.type_code} × {get_sign(self.sign_key)['name']}"


def element_pair_key(e1: str, e2: str) -> str:
    a, b = sorted((e1, e2), key=ELEMENT_ORDER.index)
    return a + b


def _type_points(t1: str, t2: str) -> int:
    ei_diff, sn_same, tf_diff, jp_diff = t1[0] != t2[0], t1[1] == t2[1], t1[2] != t2[2], t1[3] != t2[3]
    pts = 16 if sn_same else 0
    pts += 8 if ei_diff else 5
    pts += 6 if tf_diff else 5
    pts += 7 if jp_diff else 5
    if sn_same and ei_diff and jp_diff:
        pts += 8  # 常说的「黄金搭档」：同 N/S，E/I 和 J/P 互补
    return pts


def _sign_points(s1: dict, s2: dict) -> int:
    key = element_pair_key(s1["element"], s2["element"])
    harmony = rules()["pair"]["harmony"]
    if key in harmony["same"]:
        pts = 32
    elif key in harmony["support"]:
        pts = 30
    else:
        pts = 20
    if s1["modality"] != s2["modality"]:
        pts += 5
    return pts


_RAW_MIN = 0 + 5 + 5 + 5 + 20
_RAW_MAX = 16 + 8 + 6 + 7 + 8 + 32 + 5


def raw_score(a: Person, b: Person) -> int:
    return _type_points(a.type_code, b.type_code) + _sign_points(get_sign(a.sign_key), get_sign(b.sign_key))


def display_score(raw: int) -> int:
    span = SCORE_MAX - SCORE_MIN
    return round(SCORE_MIN + (raw - _RAW_MIN) * span / (_RAW_MAX - _RAW_MIN))


def best_matches(me: Person, n: int = 3) -> list[Person]:
    """在 192 种组合里找最合拍的 n 个，类型和星座都不重复，结果固定可复现。"""
    candidates = []
    for ti, t in enumerate(TYPE_CODES):
        for si, s in enumerate(SIGN_KEYS):
            other = Person(t, s)
            if other == me:
                continue
            candidates.append((-raw_score(me, other), ti, si, other))
    candidates.sort(key=lambda c: c[:3])
    picked: list[Person] = []
    for *_, other in candidates:
        if any(p.type_code == other.type_code or p.sign_key == other.sign_key for p in picked):
            continue
        picked.append(other)
        if len(picked) == n:
            break
    return picked


def match_reason(me: Person, other: Person) -> str:
    """给「最合拍的组合」写一句默认理由。"""
    r = rules()["pair"]
    s1, s2 = get_sign(me.sign_key), get_sign(other.sign_key)
    ep = r["element_pairs"][element_pair_key(s1["element"], s2["element"])]
    t1, t2 = me.type_code, other.type_code
    if t1[1] == t2[1] and t1[0] != t2[0] and t1[3] != t2[3]:
        type_part = "思考同频、节奏互补"
    elif t1[1] == t2[1]:
        type_part = "看世界的方式很接近"
    else:
        type_part = "一个看细节、一个看大局"
    type_part += "，还能在理性和感性之间互相补位" if t1[2] != t2[2] else "，在乎的东西也很像"
    return f"{type_part}；星座上是「{ep['title']}」。"


def pair_bundle(a: Person, b: Person) -> dict:
    """配对资料包：给大模型的依据，也是没有大模型时模板报告的素材。"""
    r = rules()["pair"]
    ta, tb = get_type(a.type_code), get_type(b.type_code)
    sa, sb = get_sign(a.sign_key), get_sign(b.sign_key)
    ep_key = element_pair_key(sa["element"], sb["element"])
    ep = r["element_pairs"][ep_key]
    dims = r["dims"]
    c1, c2 = a.type_code, b.type_code

    highlights: list[str] = []
    frictions: list[dict] = []

    if c1[1] == c2[1]:
        highlights.append(dims["SN_same"][c1[1]])
    else:
        frictions.append(dims["SN_diff"])

    for idx, dim in ((0, "EI"), (2, "TF"), (3, "JP")):
        if c1[idx] == c2[idx]:
            highlights.append(dims[f"{dim}_same"][c1[idx]])
        else:
            highlights.append(dims[f"{dim}_diff"]["highlight"])
            frictions.append({"point": dims[f"{dim}_diff"]["point"], "tip": dims[f"{dim}_diff"]["tip"]})

    if sa["modality"] == sb["modality"]:
        frictions.insert(0, r["modality"][sa["modality"]])
    else:
        highlights.append(r["modality"]["diff"])

    if not frictions:
        frictions.append({"point": "你们太像了，有时会一起钻进同一个牛角尖", "tip": "偶尔约上朋友一起玩，给彼此带来新的视角。"})

    ideas = r["date_ideas"]
    if sa["element"] == sb["element"]:
        date_idea = f"可以{ideas[sa['element']]}。"
    else:
        date_idea = f"可以{ideas[sa['element']]}；也可以{ideas[sb['element']]}。"

    raw = raw_score(a, b)
    return {
        "a": {"label": a.label, "type": ta, "sign": sa, "nickname": sa["prefix"] + ta["nickname"]},
        "b": {"label": b.label, "type": tb, "sign": sb, "nickname": sb["prefix"] + tb["nickname"]},
        "element_pair": {"key": ep_key, **ep},
        "score": display_score(raw),
        "highlights": highlights[:3],
        "frictions": frictions[:2],
        "date_idea": date_idea,
    }
