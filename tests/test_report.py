import io
import json

import pytest
from PIL import Image

from core import llm
from core.card import H, W, pair_card, single_card, wrap, font
from core.knowledge import SIGN_KEYS, TYPE_CODES
from core.llm import LLMConfig, LLMError, parse_json
from core.pairing import Person
from core.report import generate_pair, generate_single, single_user_prompt
from core.combo import single_bundle

CFG = LLMConfig(api_key="test-key")


def test_template_report_for_every_combo():
    for t in TYPE_CODES:
        for s in SIGN_KEYS:
            r = generate_single(t, s)
            assert r["source"] == "template"
            for key in ("nickname", "one_liner", "core", "love", "work", "hug"):
                assert r[key]
            assert len(r["strengths"]) == 3 and len(r["blindspots"]) == 3 and len(r["matches"]) == 3


def test_template_pair_report():
    r = generate_pair(Person("INFP", "双鱼"), Person("ENTJ", "狮子"))
    assert r["source"] == "template"
    assert r["title"] == "雾里的彩虹"
    assert 66 <= r["score"] <= 98


def test_parse_json_tolerates_fences():
    assert parse_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert parse_json('好的：{"a": 2} 以上') == {"a": 2}
    with pytest.raises(LLMError):
        parse_json("没有 JSON")


def test_prompt_contains_bundle():
    p = single_user_prompt(single_bundle("INFP", "双鱼"))
    assert "INFP × 双鱼座" in p and "印证" in p and "matches" in p


def _fake_chat(payload):
    def fake(cfg, system, user):
        assert "JSON" in system
        return payload
    return fake


def test_ai_fields_used_when_valid(monkeypatch):
    b = single_bundle("INFP", "双鱼")
    ai = {
        "nickname": "月亮下的造梦人",
        "one_liner": "安静又闪光的你。",
        "core": "很长的核心解读" * 10,
        "strengths": ["一", "二", "三"],
        "blindspots": ["甲", "乙", "丙"],
        "love": "恋爱文字",
        "work": "工作文字",
        "matches": [{"combo": m["combo"], "reason": "AI 理由"} for m in b["matches"]],
        "hug": "抱抱你",
    }
    monkeypatch.setattr("core.report.chat_json", _fake_chat(ai))
    r = generate_single("INFP", "双鱼", CFG)
    assert r["source"] == "ai"
    assert r["nickname"] == "月亮下的造梦人"
    assert [m["reason"] for m in r["matches"]] == ["AI 理由"] * 3
    assert r["label"] == "INFP × 双鱼座"


def test_bad_ai_fields_fall_back(monkeypatch):
    ai = {"nickname": "", "core": 123, "strengths": ["只有一条"], "matches": [{"combo": "不存在", "reason": "x"}]}
    monkeypatch.setattr("core.report.chat_json", _fake_chat(ai))
    r = generate_single("INFP", "双鱼", CFG)
    fb = generate_single("INFP", "双鱼")
    assert r["nickname"] == fb["nickname"]
    assert r["core"] == fb["core"]
    assert r["strengths"] == fb["strengths"]
    assert r["matches"] == fb["matches"]


def test_llm_error_falls_back(monkeypatch):
    def boom(cfg, system, user):
        raise LLMError("超时")
    monkeypatch.setattr("core.report.chat_json", boom)
    assert generate_single("ENTP", "双子", CFG)["source"] == "template"
    assert generate_pair(Person("ENTP", "双子"), Person("ISFJ", "巨蟹"), CFG)["source"] == "template"


def test_chat_json_http_error(monkeypatch):
    class Resp:
        status_code = 401

    monkeypatch.setattr(llm.requests, "post", lambda *a, **k: Resp())
    with pytest.raises(LLMError):
        llm.chat_json(CFG, "s", "u")


def test_chat_json_ok(monkeypatch):
    class Resp:
        status_code = 200

        def json(self):
            return {"choices": [{"message": {"content": json.dumps({"hug": "你好"}, ensure_ascii=False)}}]}

    seen = {}

    def fake_post(url, headers, json, timeout):
        seen.update(url=url, model=json["model"], auth=headers["Authorization"])
        return Resp()

    monkeypatch.setattr(llm.requests, "post", fake_post)
    assert llm.chat_json(CFG, "s", "u") == {"hug": "你好"}
    assert seen["url"] == "https://api.deepseek.com/chat/completions"
    assert seen["model"] == "deepseek-chat" and seen["auth"] == "Bearer test-key"


# ---------- 分享图 ----------

def test_cards_render():
    r = generate_single("INFP", "双鱼")
    img = Image.open(io.BytesIO(single_card(r, site="example.streamlit.app")))
    assert img.size == (W, H) == (1080, 1440)
    p = generate_pair(Person("INFP", "双鱼"), Person("ENTJ", "狮子"))
    img = Image.open(io.BytesIO(pair_card(p)))
    assert img.size == (1080, 1440)


def test_long_text_is_truncated_on_card():
    r = generate_single("INFP", "双鱼")
    r["core"] = "很长的文字，" * 200
    single_card(r)  # 不应报错或溢出


def test_wrap_keeps_words_and_punctuation():
    f = font(30)
    lines = wrap("INFP 和 ENTJ，" * 10, f, 300)
    assert all(not line.startswith(("，", "。")) for line in lines)
    assert all("INF\n" not in line for line in lines)
    assert wrap("一二三四五六七八九十" * 20, f, 300, max_lines=2)[-1].endswith("…")


def test_placeholder_key_falls_back_instead_of_crashing():
    cfg = LLMConfig(api_key="在这里粘贴你的Key", base_url="http://127.0.0.1:9")
    with pytest.raises(LLMError):
        llm.chat_json(cfg, "s", "u")
    assert generate_single("INFP", "双鱼", cfg)["source"] == "template"
    assert generate_pair(Person("INFP", "双鱼"), Person("ENTJ", "狮子"), cfg)["source"] == "template"


def test_unexpected_error_falls_back(monkeypatch):
    def boom(cfg, system, user):
        raise RuntimeError("意外")
    monkeypatch.setattr("core.report.chat_json", boom)
    assert generate_single("INFP", "双鱼", CFG)["source"] == "template"


def test_key_looks_valid():
    assert llm.key_looks_valid("sk-abc123")
    assert not llm.key_looks_valid("在这里粘贴你的Key")
    assert not llm.key_looks_valid("")
    assert not llm.key_looks_valid("   ")
    assert not llm.key_looks_valid(None)
