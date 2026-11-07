"""32 题快测计分。

题目来自 OpenJung 项目整理的 OEJTS 1.2 中文版（data/oejts_zh.json），
每题 1–5 分：1 = 很像左边的描述，5 = 很像右边的描述。
左边的描述对应 E、S、F、J，右边对应 I、N、T、P。
每个维度 8 题，总分 8–40，大于 24 取右边的字母，否则取左边（与 OpenJung 的计分一致）。
"""

from __future__ import annotations

from .knowledge import quiz_items

POLES = {"EI": ("E", "I"), "SN": ("S", "N"), "TF": ("F", "T"), "JP": ("J", "P")}
ORDER = ("EI", "SN", "TF", "JP")
THRESHOLD = 24
NEUTRAL = 3

ATTRIBUTION = (
    "快测题目改编自 Open Psychometrics 的 Open Extended Jungian Type Scales 1.2（Eric Jorgenson），"
    "中文译文来自 OpenJung 项目，按 CC BY-NC-SA 4.0 协议使用。结果仅供参考。"
)


def dimension_scores(answers: dict[int, int]) -> dict[str, int]:
    scores = {d: 0 for d in ORDER}
    for item in quiz_items():
        v = int(answers.get(item["id"], NEUTRAL))
        if not 1 <= v <= 5:
            raise ValueError(f"第 {item['id']} 题的答案应在 1–5 之间")
        scores[item["dimension"]] += v
    return scores


def score(answers: dict[int, int]) -> dict:
    """返回类型和每个维度偏向右边字母的百分比。"""
    scores = dimension_scores(answers)
    letters = []
    percents = {}
    for d in ORDER:
        left, right = POLES[d]
        letters.append(right if scores[d] > THRESHOLD else left)
        right_pct = round((scores[d] - 8) / 32 * 100)
        percents[d] = {left: 100 - right_pct, right: right_pct}
    return {"type": "".join(letters), "scores": scores, "percents": percents}
