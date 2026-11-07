import datetime as dt

import pytest

from core import quiz
from core.astro import cusp_note, sun_sign_key
from core.combo import signals, single_bundle
from core.knowledge import SIGN_KEYS, TYPE_CODES, get_sign, quiz_items, signs, types
from core.pairing import Person, best_matches, display_score, pair_bundle, raw_score


# ---------- 资料库 ----------

def test_data_complete():
    assert set(types()) == set(TYPE_CODES)
    assert set(signs()) == set(SIGN_KEYS)
    for code, t in types().items():
        assert len(t["keywords"]) == 3 and len(t["strengths"]) == 3 and len(t["blindspots"]) == 3, code
        for key in ("nickname", "functions", "tagline", "core", "love", "work", "hug"):
            assert t[key], (code, key)
    for key, s in signs().items():
        assert s["element"] in "火土风水" and s["modality"] in ("本位", "固定", "变动"), key
        assert len(s["strengths"]) == 3 and len(s["blindspots"]) == 3, key


def test_nicknames_unique():
    names = {s["prefix"] + t["nickname"] for s in signs().values() for t in types().values()}
    assert len(names) == 192


# ---------- 星座 ----------

@pytest.mark.parametrize("date,expected", [
    ((2000, 3, 20), "双鱼"), ((2000, 3, 21), "白羊"),
    ((2000, 4, 19), "白羊"), ((2000, 4, 20), "金牛"),
    ((2000, 6, 21), "双子"), ((2000, 6, 22), "巨蟹"),
    ((2000, 8, 22), "狮子"), ((2000, 8, 23), "处女"),
    ((2000, 10, 23), "天秤"), ((2000, 10, 24), "天蝎"),
    ((2000, 12, 21), "射手"), ((2000, 12, 22), "摩羯"),
    ((2001, 1, 19), "摩羯"), ((2001, 1, 20), "水瓶"),
    ((2001, 2, 18), "水瓶"), ((2001, 2, 19), "双鱼"),
    ((2004, 2, 29), "双鱼"),
])
def test_sun_sign_boundaries(date, expected):
    assert sun_sign_key(dt.date(*date)) == expected


def test_every_day_maps_to_a_known_sign():
    d = dt.date(2001, 1, 1)
    while d.year == 2001:
        assert sun_sign_key(d) in SIGN_KEYS
        d += dt.timedelta(days=1)


def test_cusp_note():
    assert cusp_note(dt.date(2000, 3, 20)) is not None
    assert cusp_note(dt.date(2000, 3, 21)) is not None
    assert cusp_note(dt.date(2000, 3, 10)) is None


# ---------- 单人组合 ----------

def test_all_192_combos_build():
    for t in TYPE_CODES:
        for s in SIGN_KEYS:
            b = single_bundle(t, s)
            assert len(b["signals"]) == 4
            assert {x["kind"] for x in b["signals"]} <= {"印证", "张力"}
            assert len(b["matches"]) == 3
            assert "{" not in "".join(x["text"] for x in b["signals"])


def test_signals_examples():
    kinds = [x["kind"] for x in signals("INFP", get_sign("双鱼"))]
    assert kinds == ["印证", "印证", "印证", "印证"]
    kinds = [x["kind"] for x in signals("ESTJ", get_sign("双鱼"))]
    assert kinds == ["张力", "张力", "张力", "张力"]


def test_best_matches_distinct_and_stable():
    me = Person("INFP", "双鱼")
    m1, m2 = best_matches(me), best_matches(me)
    assert m1 == m2
    assert len({m.type_code for m in m1}) == 3 and len({m.sign_key for m in m1}) == 3
    assert me not in m1
    # 同 N/S、E/I 和 J/P 互补的类型排在前面
    assert m1[0].type_code in ("ENFJ", "ENTJ")


# ---------- 双人配对 ----------

def test_pair_scores_in_range():
    people = [Person(t, s) for t in TYPE_CODES for s in SIGN_KEYS]
    scores = {display_score(raw_score(a, b)) for a in people[::7] for b in people[::5]}
    assert min(scores) >= 66 and max(scores) <= 98


def test_pair_symmetric_score():
    a, b = Person("INTJ", "天蝎"), Person("ENFP", "射手")
    assert raw_score(a, b) == raw_score(b, a)


def test_pair_bundle_shape():
    p = pair_bundle(Person("INFP", "双鱼"), Person("ENTJ", "狮子"))
    assert p["element_pair"]["key"] == "火水"
    assert 1 <= len(p["highlights"]) <= 3
    assert 1 <= len(p["frictions"]) <= 2
    p2 = pair_bundle(Person("INFP", "双鱼"), Person("INFP", "双鱼"))
    assert p2["frictions"]  # 一模一样的两个人也至少有一条温柔的提醒


# ---------- 快测计分 ----------

def test_quiz_has_32_items_8_per_dimension():
    items = quiz_items()
    assert len(items) == 32
    for dim in quiz.ORDER:
        assert sum(1 for i in items if i["dimension"] == dim) == 8


def test_quiz_scoring_poles():
    ids = [i["id"] for i in quiz_items()]
    assert quiz.score({i: 1 for i in ids})["type"] == "ESFJ"
    assert quiz.score({i: 5 for i in ids})["type"] == "INTP"
    assert quiz.score({i: 3 for i in ids})["type"] == "ESFJ"  # 正好 24 分取左边，与 OpenJung 一致


def test_quiz_mixed():
    answers = {}
    for item in quiz_items():
        answers[item["id"]] = {"EI": 5, "SN": 4, "TF": 2, "JP": 4}[item["dimension"]]
    r = quiz.score(answers)
    assert r["type"] == "INFP"
    assert r["percents"]["EI"]["I"] == 100


def test_quiz_rejects_bad_value():
    with pytest.raises(ValueError):
        quiz.score({1: 9})
