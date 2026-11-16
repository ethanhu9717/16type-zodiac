"""用现有 Python 引擎生成小工具对照夹具。只读 core，不改 Streamlit 代码。"""

from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from core.astro import cusp_note, make_birthday, sun_sign_key
from core.knowledge import SIGN_KEYS, TYPE_CODES
from core.pairing import Person, best_matches, raw_score
from core.report import generate_pair, generate_single

OUT = Path(__file__).resolve().parents[1] / "test" / "fixtures"


def person_at(index: int) -> Person:
    return Person(TYPE_CODES[index // 12], SIGN_KEYS[index % 12])


def index_of(person: Person) -> list[int]:
    return [TYPE_CODES.index(person.type_code), SIGN_KEYS.index(person.sign_key)]


def write(name: str, data) -> None:
    path = OUT / name
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{name} {path.stat().st_size} bytes")


def singles() -> None:
    rows = []
    for ti, type_code in enumerate(TYPE_CODES):
        for si, sign_key in enumerate(SIGN_KEYS):
            me = Person(type_code, sign_key)
            picks = []
            for other in best_matches(me):
                picks.append({
                    "type_index": TYPE_CODES.index(other.type_code),
                    "sign_index": SIGN_KEYS.index(other.sign_key),
                    "raw": raw_score(me, other),
                })
            rows.append({
                "type_index": ti,
                "sign_index": si,
                "report": generate_single(type_code, sign_key),
                "match_order": picks,
            })
    write("singles.json", rows)


def pair_scores() -> None:
    raws = []
    displays = []
    people = [person_at(i) for i in range(192)]
    for a in people:
        for b in people:
            bundle = generate_pair(a, b)
            raws.append(raw_score(a, b))
            displays.append(bundle["score"])
    write("pair_scores.json", {"raw": raws, "display": displays})


def ties() -> None:
    chosen = None
    adjacent = None
    for index in range(192):
        me = person_at(index)
        ranked = []
        for ti, type_code in enumerate(TYPE_CODES):
            for si, sign_key in enumerate(SIGN_KEYS):
                other = Person(type_code, sign_key)
                if other == me:
                    continue
                ranked.append((-raw_score(me, other), ti, si, raw_score(me, other)))
        ranked.sort()
        flat = [[ti, si, raw] for _neg, ti, si, raw in ranked]
        for left, right in zip(flat, flat[1:]):
            if left[2] == right[2] and (left[0], left[1]) < (right[0], right[1]):
                adjacent = {"left": left, "right": right}
                break
        if adjacent:
            chosen = {"me": index_of(me), "ranked": flat}
            break
    if chosen is None or adjacent is None:
        raise SystemExit("没有找到原始分并列，排序夹具无法证明并列规则")
    write("ties.json", {"sample": chosen, "adjacent_tie": adjacent})


def find_sign(element: str, modality: str) -> str:
    from core.knowledge import get_sign

    for key in SIGN_KEYS:
        sign = get_sign(key)
        if sign["element"] == element and sign["modality"] == modality:
            return key
    raise RuntimeError((element, modality))


def type_code(ei_same: bool, sn_same: bool, tf_same: bool, jp_same: bool) -> str:
    base = "INTJ"
    letters = [
        base[0] if ei_same else ("E" if base[0] == "I" else "I"),
        base[1] if sn_same else ("S" if base[1] == "N" else "N"),
        base[2] if tf_same else ("F" if base[2] == "T" else "T"),
        base[3] if jp_same else ("P" if base[3] == "J" else "P"),
    ]
    return "".join(letters)


def copy_order() -> None:
    cases = []
    relations = {
        "same": ("火", "火"),
        "support": ("火", "风"),
        "other": ("火", "土"),
    }
    for ei_same in (True, False):
        for sn_same in (True, False):
            for tf_same in (True, False):
                for jp_same in (True, False):
                    for relation, (e1, e2) in relations.items():
                        for modality_same in (True, False):
                            sign_a = find_sign(e1, "本位")
                            sign_b = find_sign(e2, "本位" if modality_same else "固定")
                            a = Person("INTJ", sign_a)
                            b = Person(type_code(ei_same, sn_same, tf_same, jp_same), sign_b)
                            cases.append({
                                "branch": {
                                    "ei_same": ei_same,
                                    "sn_same": sn_same,
                                    "tf_same": tf_same,
                                    "jp_same": jp_same,
                                    "element": relation,
                                    "modality_same": modality_same,
                                },
                                "a": index_of(a),
                                "b": index_of(b),
                                "forward": generate_pair(a, b),
                                "reverse": generate_pair(b, a),
                            })
    self_person = Person("INFP", "双鱼")
    cases.append({
        "branch": {"self": True},
        "a": index_of(self_person),
        "b": index_of(self_person),
        "forward": generate_pair(self_person, self_person),
        "reverse": generate_pair(self_person, self_person),
    })
    write("copy_order.json", cases)


def astro() -> None:
    years = {}
    for year in (2000, 2001, 2004):
        signs = []
        day = dt.date(year, 1, 1)
        while day.year == year:
            signs.append(sun_sign_key(day))
            day += dt.timedelta(days=1)
        years[str(year)] = signs
    notes = []
    for raw in ("2000-03-20", "2000-03-21", "2000-03-10"):
        y, m, d = (int(part) for part in raw.split("-"))
        notes.append({"date": raw, "note": cusp_note(dt.date(y, m, d))})
    today = dt.date(2026, 11, 7)
    birthdays = []
    for year, month, day in (
        (1990, None, 5),
        (1990, 3, None),
        (1990, 3, 5),
        (2000, 2, 29),
        (1990, 2, 29),
        (2026, 12, 1),
    ):
        found, message = make_birthday(year, month, day, today)
        birthdays.append({
            "year": year,
            "month": month,
            "day": day,
            "date": found.isoformat() if found else None,
            "message": message,
        })
    write("astro.json", {"years": years, "cusp": notes, "birthdays": birthdays, "today": "2026-11-07"})


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    singles()
    pair_scores()
    ties()
    copy_order()
    astro()


if __name__ == "__main__":
    main()
