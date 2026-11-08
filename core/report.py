"""报告生成：资料包 → 大模型润色；大模型不可用或输出不合格时，用资料库拼出模板报告。"""

from __future__ import annotations

import json
import logging

from .combo import single_bundle
from .llm import LLMConfig, LLMError, chat_json
from .pairing import Person, pair_bundle

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """你是「16 型人格 × 星座」解读网站的写作者，文风温柔、治愈，像一个懂对方的朋友在写信。
规则：
1. 只根据用户消息里的【资料包】写作，可以润色、串联、举生活化的小例子，但不要新增资料包里没有的判断。
2. 多用「你」，少用术语；具体、有画面感；不说教，不贬低。
3. 不使用「注定」「一定会」「最适合」「绝对」这类绝对化表达，不做宿命论判断。
4. 说盲点和摩擦时要温柔，并给一个做得到的小建议。
5. 不提供医疗、心理诊断、投资等专业建议。
6. 只输出一个 JSON 对象，不要输出任何其他文字。"""

SINGLE_SCHEMA = """{
  "nickname": "组合昵称，6–10 个字；可以直接用资料包里的 nickname，或在它的基础上微调",
  "one_liner": "一句话画像，30 字以内",
  "core": "性格核心，150–220 字，写出两套体系哪里互相印证、哪里有张力（资料包 signals 已经算好，请自然地融进文字）",
  "strengths": ["优势，每条 25 字以内，共 3 条"],
  "blindspots": ["盲点，每条 35 字以内，温柔地说并带一个小建议，共 3 条"],
  "love": "恋爱与人际，80–120 字",
  "work": "工作与学习，80–120 字",
  "matches": [{"combo": "照抄资料包 matches 里的 combo", "reason": "一句理由，30 字以内"}],
  "hug": "写给对方的一句温柔的话，30 字以内"
}"""

PAIR_SCHEMA = """{
  "title": "配对标题，4–8 个字，可以直接用资料包里的 element_pair.title",
  "one_liner": "一句话描述你们俩，30 字以内",
  "chemistry": "你们的化学反应，150–220 字，结合两个人的类型和星座",
  "highlights": ["相处亮点，每条 30 字以内，共 3 条"],
  "frictions": [{"point": "可能的小摩擦，20 字以内", "tip": "温柔、做得到的小建议，30 字以内"}],
  "date_idea": "一个适合你们的相处小提议，40 字以内",
  "hug": "写给你们俩的一句话，30 字以内"
}"""

DISCLAIMER = "本报告由 AI 生成，仅供娱乐参考。"

PAIR_HUGS = (
    "你们不必完全一样，愿意理解彼此的不同，就是最好的默契。",
    "靠近一个人，是带着自己的样子，也接住对方的样子。",
    "慢慢来，好的关系都是一点点相处出来的。",
)


def _prompt_bundle_single(b: dict) -> dict:
    t, s = b["type"], b["sign"]
    return {
        "label": b["label"],
        "nickname": b["nickname"],
        "one_liner": b["one_liner"],
        "type": {k: t[k] for k in ("code", "nickname", "functions", "keywords", "core", "strengths", "blindspots", "love", "work")},
        "sign": {k: s[k] for k in ("name", "element", "modality", "ruler", "keywords", "core", "strengths", "blindspots", "love", "work")},
        "signals": [{"维度": x["dim_name"], "关系": x["kind"], "依据": x["text"]} for x in b["signals"]],
        "matches": b["matches"],
    }


def single_user_prompt(b: dict) -> str:
    data = json.dumps(_prompt_bundle_single(b), ensure_ascii=False, indent=1)
    return (
        f"请根据下面的【资料包】，为用户写一份「{b['label']}」的组合报告。\n\n"
        f"只输出一个 JSON 对象，字段如下：\n{SINGLE_SCHEMA}\n\n【资料包】\n{data}"
    )


def _prompt_bundle_pair(p: dict) -> dict:
    def person(x: dict) -> dict:
        t, s = x["type"], x["sign"]
        return {
            "label": x["label"],
            "nickname": x["nickname"],
            "type": {k: t[k] for k in ("code", "nickname", "keywords", "core", "love")},
            "sign": {k: s[k] for k in ("name", "element", "modality", "keywords", "love")},
        }

    return {
        "你": person(p["a"]),
        "TA": person(p["b"]),
        "element_pair": p["element_pair"],
        "默契指数": p["score"],
        "highlights": p["highlights"],
        "frictions": p["frictions"],
        "date_idea": p["date_idea"],
    }


def pair_user_prompt(p: dict) -> str:
    data = json.dumps(_prompt_bundle_pair(p), ensure_ascii=False, indent=1)
    return (
        f"请根据下面的【资料包】，写一份双人配对报告。用「你」称呼第一个人，用「TA」称呼第二个人，"
        f"也可以用「你们」。默契指数已经算好，不要改动，也不要在文字里写具体分数。\n\n"
        f"只输出一个 JSON 对象，字段如下：\n{PAIR_SCHEMA}\n\n【资料包】\n{data}"
    )


# ---------- 模板报告（没有大模型时也能出结果） ----------

def _least_overlap(picked: list[str], options: list[str]) -> str:
    """从星座的几条里挑一条和类型那两条最不重复的（比如都写「共情力强」时换一条）。"""
    used = set("".join(picked)) - set("，。、；：「」的了和也很能")

    def overlap(x: str) -> float:
        chars = set(x[:6])
        return len(chars & used) / max(1, len(chars))

    return min(options, key=overlap)


def fallback_single(b: dict) -> dict:
    t, s = b["type"], b["sign"]
    strengths = t["strengths"][:2]
    blindspots = t["blindspots"][:2]
    return {
        "nickname": b["nickname"],
        "one_liner": b["one_liner"],
        "core": f"{t['core']}{s['core']}",
        "strengths": strengths + [_least_overlap(strengths, s["strengths"])],
        "blindspots": blindspots + [_least_overlap(blindspots, s["blindspots"])],
        "love": f"{t['love']}{s['name']}的你{s['love']}",
        "work": f"{t['work']}另外，{s['name']}的你也{s['work']}",
        "matches": b["matches"],
        "hug": t["hug"],
    }


def fallback_pair(p: dict) -> dict:
    a, b = p["a"], p["b"]
    same = sum(x == y for x, y in zip(a["type"]["code"], b["type"]["code"]))
    if same >= 3:
        type_line = f"你们的 16 型人格有 {same} 个字母相同，很多想法不用解释就能懂。"
    elif same == 2:
        type_line = "你们的 16 型人格一半相同、一半不同，既有共同语言，也有互相学习的空间。"
    else:
        type_line = "你们的 16 型人格差别不小，正好能看见彼此看不到的那一面。"
    seed = sum(ord(c) for c in a["label"] + b["label"])
    return {
        "title": p["element_pair"]["title"],
        "one_liner": p["element_pair"]["text"],
        "chemistry": (
            f"{a['label']}的「{a['nickname']}」，遇见{b['label']}的「{b['nickname']}」。"
            f"{p['element_pair']['text']}{type_line}"
        ),
        "highlights": p["highlights"],
        "frictions": p["frictions"],
        "date_idea": p["date_idea"],
        "hug": PAIR_HUGS[seed % len(PAIR_HUGS)],
    }


# ---------- 校验：大模型的每个字段不合格就用模板字段替换 ----------

def _ok_text(v, max_len: int) -> bool:
    return isinstance(v, str) and 0 < len(v.strip()) <= max_len


def _ok_list(v, n_min: int, n_max: int, max_len: int) -> bool:
    return isinstance(v, list) and n_min <= len(v) <= n_max and all(_ok_text(x, max_len) for x in v)


def merge_single(ai: dict, fb: dict) -> dict:
    out = dict(fb)
    for key, limit in (("nickname", 16), ("one_liner", 60), ("core", 420), ("love", 260), ("work", 260), ("hug", 60)):
        if _ok_text(ai.get(key), limit):
            out[key] = ai[key].strip()
    for key in ("strengths", "blindspots"):
        if _ok_list(ai.get(key), 3, 3, 70):
            out[key] = [x.strip() for x in ai[key]]
    reasons = {}
    for m in ai.get("matches") or []:
        if isinstance(m, dict) and _ok_text(m.get("reason"), 60) and isinstance(m.get("combo"), str):
            reasons[m["combo"].replace(" ", "")] = m["reason"].strip()
    out["matches"] = [
        {"combo": m["combo"], "reason": reasons.get(m["combo"].replace(" ", ""), m["reason"])}
        for m in fb["matches"]
    ]
    return out


def merge_pair(ai: dict, fb: dict) -> dict:
    out = dict(fb)
    for key, limit in (("title", 14), ("one_liner", 60), ("chemistry", 420), ("date_idea", 90), ("hug", 60)):
        if _ok_text(ai.get(key), limit):
            out[key] = ai[key].strip()
    if _ok_list(ai.get("highlights"), 2, 4, 70):
        out["highlights"] = [x.strip() for x in ai["highlights"]][:3]
    fr = ai.get("frictions")
    if isinstance(fr, list) and 1 <= len(fr) <= 3 and all(
        isinstance(x, dict) and _ok_text(x.get("point"), 40) and _ok_text(x.get("tip"), 70) for x in fr
    ):
        out["frictions"] = [{"point": x["point"].strip(), "tip": x["tip"].strip()} for x in fr][:2]
    return out


# ---------- 对外接口 ----------

def generate_single(type_code: str, sign_key: str, cfg: LLMConfig | None = None) -> dict:
    b = single_bundle(type_code, sign_key)
    fb = fallback_single(b)
    report, source = fb, "template"
    if cfg and cfg.api_key:
        try:
            report, source = merge_single(chat_json(cfg, SYSTEM_PROMPT, single_user_prompt(b)), fb), "ai"
        except LLMError as e:
            log.warning("大模型生成失败，改用模板报告：%s", e)
        except Exception:  # 兜底：AI 出任何意外都不能让网站报错
            log.exception("大模型调用出现意外错误，改用模板报告")
    return {
        **report,
        "label": b["label"],
        "type_code": b["type"]["code"],
        "sign_key": b["sign"]["key"],
        "type_nickname": b["type"]["nickname"],
        "sign": {k: b["sign"][k] for k in ("name", "symbol", "element", "modality", "dates")},
        "keywords": b["keywords"],
        "signals": b["signals"],
        "source": source,
    }


def generate_pair(a: Person, b: Person, cfg: LLMConfig | None = None) -> dict:
    p = pair_bundle(a, b)
    fb = fallback_pair(p)
    report, source = fb, "template"
    if cfg and cfg.api_key:
        try:
            report, source = merge_pair(chat_json(cfg, SYSTEM_PROMPT, pair_user_prompt(p)), fb), "ai"
        except LLMError as e:
            log.warning("大模型生成失败，改用模板报告：%s", e)
        except Exception:  # 兜底：AI 出任何意外都不能让网站报错
            log.exception("大模型调用出现意外错误，改用模板报告")
    return {
        **report,
        "score": p["score"],
        "a": {"label": p["a"]["label"], "nickname": p["a"]["nickname"], "element": p["a"]["sign"]["element"],
              "symbol": p["a"]["sign"]["symbol"]},
        "b": {"label": p["b"]["label"], "nickname": p["b"]["nickname"], "element": p["b"]["sign"]["element"],
              "symbol": p["b"]["sign"]["symbol"]},
        "element_pair": p["element_pair"]["key"],
        "source": source,
    }
