"""单人组合：「类型 × 星座」→ 资料包。"""

from __future__ import annotations

from .knowledge import get_sign, get_type, rules
from .pairing import Person, best_matches, match_reason

DIM_NAMES = {"EI": "能量方向", "SN": "看世界的方式", "TF": "做决定的方式", "JP": "生活节奏"}


def signals(type_code: str, sign: dict) -> list[dict]:
    """两套体系四个维度的对照：每个维度一条「印证」或「张力」。"""
    r = rules()
    groups = r["element_groups"]
    single = r["single"]
    el, mod = sign["element"], sign["modality"]

    ei = f"{type_code[0]}_{'outward' if el in groups['outward'] else 'inward'}"
    if el in groups["idea"]:
        sn_suffix = "idea"
    elif el == "水":
        sn_suffix = "water"
    else:
        sn_suffix = "earth"
    sn = f"{type_code[1]}_{sn_suffix}"
    tf = f"{type_code[2]}_{'feeling' if el in groups['feeling'] else 'logic'}"
    jp = f"{type_code[3]}_{mod}"

    out = []
    for dim, key in (("EI", ei), ("SN", sn), ("TF", tf), ("JP", jp)):
        rule = single[dim][key]
        out.append({
            "dim": dim,
            "dim_name": DIM_NAMES[dim],
            "kind": rule["kind"],
            "text": rule["text"].format(sign=sign["name"], element=el, modality=mod),
        })
    return out


def single_bundle(type_code: str, sign_key: str) -> dict:
    """单人资料包：给大模型的依据，也是没有大模型时模板报告的素材。"""
    t = get_type(type_code)
    s = get_sign(sign_key)
    me = Person(t["code"], s["key"])
    matches = [
        {"combo": m.label, "reason": match_reason(me, m)}
        for m in best_matches(me)
    ]
    return {
        "label": me.label,
        "type": t,
        "sign": s,
        "nickname": s["prefix"] + t["nickname"],
        "one_liner": f"{t['tagline']}，{s['tint']}。",
        "keywords": t["keywords"][:2] + s["keywords"][:2],
        "signals": signals(t["code"], s),
        "matches": matches,
    }
