import pytest

from core import ask
from core.ask import MAX_ANSWER, MAX_QUESTION, ask_pair, ask_single, clean_question
from core.llm import LLMConfig, LLMError
from core.pairing import Person

CFG = LLMConfig(api_key="test-key")


def _capture(answer):
    seen = {}

    def fake(cfg, system, user):
        seen.update(system=system, user=user)
        return answer

    return seen, fake


def test_clean_question():
    assert clean_question("  我适合\n\n什么工作？  ") == "我适合 什么工作？"
    assert clean_question(None) == ""
    assert len(clean_question("问" * 300)) == MAX_QUESTION


def test_ask_single_uses_bundle_and_question(monkeypatch):
    seen, fake = _capture({"answer": "  你可以试试……  "})
    monkeypatch.setattr(ask, "chat_json", fake)
    assert ask_single("INFP", "双鱼", "我适合什么样的工作？", CFG) == "你可以试试……"
    assert "INFP × 双鱼座" in seen["user"] and "我适合什么样的工作？" in seen["user"]
    assert "【资料包】" in seen["user"] and "JSON" in seen["system"]
    assert "心理援助热线" in seen["system"]


def test_ask_pair_mentions_both_people(monkeypatch):
    seen, fake = _capture({"answer": "你们可以……"})
    monkeypatch.setattr(ask, "chat_json", fake)
    assert ask_pair(Person("INFP", "双鱼"), Person("ENTJ", "狮子"), "我们吵架了怎么办？", CFG) == "你们可以……"
    assert "INFP × 双鱼座" in seen["user"] and "ENTJ × 狮子座" in seen["user"]
    assert "不要在回答里写具体的默契指数" in seen["user"]


@pytest.mark.parametrize("bad", [{}, {"answer": ""}, {"answer": "   "}, {"answer": 123}])
def test_bad_answer_raises(monkeypatch, bad):
    monkeypatch.setattr(ask, "chat_json", lambda *a: bad)
    with pytest.raises(LLMError):
        ask_single("INFP", "双鱼", "问题", CFG)


def test_long_answer_is_cut(monkeypatch):
    monkeypatch.setattr(ask, "chat_json", lambda *a: {"answer": "长" * 2000})
    out = ask_single("INFP", "双鱼", "问题", CFG)
    assert len(out) == MAX_ANSWER + 1 and out.endswith("…")


def test_empty_question_or_no_ai_raises(monkeypatch):
    def never(*a):
        raise AssertionError("不应该调用 AI")

    monkeypatch.setattr(ask, "chat_json", never)
    with pytest.raises(LLMError):
        ask_single("INFP", "双鱼", "   ", CFG)
    with pytest.raises(LLMError):
        ask_single("INFP", "双鱼", "问题", None)
