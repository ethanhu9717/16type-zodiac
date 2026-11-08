"""16 型人格 × 星座 · 温柔解读（Streamlit 网页入口）。

本地运行：streamlit run app.py
"""

from __future__ import annotations

import datetime as dt
import html
import logging
import os
import re
from pathlib import Path
from typing import Callable

import streamlit as st

from core import quiz
from core.ask import MAX_QUESTION, PAIR_SUGGESTIONS, SINGLE_SUGGESTIONS, ask_pair, ask_single, clean_question
from core.astro import cusp_note, make_birthday, sun_sign
from core.cache import SharedCache
from core.card import pair_card, single_card
from core.knowledge import TYPE_CODES, get_type, quiz_items
from core.llm import DEFAULT_BASE_URL, DEFAULT_MODEL, LLMConfig, key_looks_valid
from core.pairing import Person
from core.report import generate_pair, generate_single

ICON = Path(__file__).parent / "assets" / "icon.png"  # 标签页图标（原创，scripts/make_icons.py 生成）
# 菜单里放一条「关于」，右上角的菜单才会出现；菜单里同时有浅色 / 深色的切换（主题在 .streamlit/config.toml）
st.set_page_config(page_title="16 型人格 × 星座", page_icon=str(ICON) if ICON.exists() else "🌙",
                   layout="centered",
                   menu_items={"About": "**16 型人格 × 星座**\n\n把两套性格语言放在一起，温柔地读懂你自己。仅供娱乐参考。"})

TODAY = dt.date.today()
MIN_DATE = dt.date(1930, 1, 1)
DEFAULT_YEAR = 1990  # 生日的年份默认停在 1990 年，不用从今年往回翻
# 星座元素的强调色：(class 名, 浅色主题, 深色主题)。深色主题用亮一点的同色系，深底上才看得清。
ELEMENT_ACCENT = {
    "火": ("fire", "#D9676A", "#F08C8E"),
    "土": ("earth", "#7F9150", "#AFC27D"),
    "风": ("air", "#8572CC", "#AE9EEC"),
    "水": ("water", "#4A88B3", "#7DB7E0"),
}


def accent_class(element: str) -> str:
    return f"acc-{ELEMENT_ACCENT[element][0]}"


def accent_rules() -> str:
    """强调色的 CSS。前面加 .stApp 是为了压过 Streamlit 给标题设的 color: inherit。"""
    plain = "".join(f".stApp .acc-{name} {{color: {light};}}\n" for name, light, _ in ELEMENT_ACCENT.values())
    themed = "".join(f".stApp .acc-{name} {{color: light-dark({light}, {dark});}}\n"
                     for name, light, dark in ELEMENT_ACCENT.values())
    return f"{plain}@supports (color: light-dark(#000, #fff)) {{\n{themed}}}\n"


# 自己画的卡片、标签用这些颜色变量。Streamlit 会按当前主题给页面设好 color-scheme，
# light-dark() 跟着它在浅色 / 深色之间切换，切换主题时不用刷新页面。
# 老浏览器不认识 light-dark()，就一直用第一组浅色卡片（深色主题下也看得清）。
CSS = """
<style>
.stApp {
  --ink: #3F3A4A; --muted: #8A7F95; --card: rgba(255,255,255,0.86); --card-line: transparent;
  --shadow: rgba(120,100,140,0.08); --chip: #fff; --badge: rgba(255,255,255,0.7);
  --ok-bg: #E5F2E1; --ok: #4D7A3E; --warn-bg: #FBE9E2; --warn: #B0573A;
  --ai-a: #F3E3EE; --ai-b: #E6E3F7; --ai: #8E4F78; --tpl-bg: #EFEDF2; --tpl: #7A7186;
}
@supports (color: light-dark(#000, #fff)) {
  .stApp {
    --ink: light-dark(#3F3A4A, #EEE8F2); --muted: light-dark(#8A7F95, #A99FB4);
    --card: light-dark(rgba(255,255,255,0.86), #1F1B25); --card-line: light-dark(transparent, #2E2936);
    --shadow: light-dark(rgba(120,100,140,0.08), rgba(0,0,0,0.35));
    --chip: light-dark(#fff, #1A171F); --badge: light-dark(rgba(255,255,255,0.7), #1F1B25);
    --ok-bg: light-dark(#E5F2E1, #213326); --ok: light-dark(#4D7A3E, #9CCB8B);
    --warn-bg: light-dark(#FBE9E2, #3A2420); --warn: light-dark(#B0573A, #EBA58C);
    --ai-a: light-dark(#F3E3EE, #3B2537); --ai-b: light-dark(#E6E3F7, #2B2944); --ai: light-dark(#8E4F78, #EBA9CF);
    --tpl-bg: light-dark(#EFEDF2, #2A2631); --tpl: light-dark(#7A7186, #B8AEC3);
  }
}
.block-container {max-width: 760px; padding-top: 2.2rem; padding-bottom: 4rem;}
.hero {text-align: center; margin-bottom: 0.6rem;}
.hero .title {font-size: 1.9rem; font-weight: 700; letter-spacing: 0.02em;}
.hero .sub {color: var(--muted); margin-top: 0.2rem;}
.rcard {background: var(--card); border: 1px solid var(--card-line); border-radius: 18px; padding: 18px 20px;
        margin: 14px 0; box-shadow: 0 2px 14px var(--shadow); color: var(--ink); line-height: 1.75;}
.rcard h4 {margin: 0 0 0.5rem 0; font-size: 1.05rem;}
.rcard p {margin: 0.2rem 0;}
.rcard ul {margin: 0.2rem 0 0.2rem 1.1rem; padding: 0;}
.headline .label {font-size: 1.7rem; font-weight: 700;}
.headline .nick {font-size: 1.25rem; font-weight: 600; margin: 0.1rem 0 0.4rem 0;}
.tag {display: inline-block; padding: 1px 12px; border-radius: 999px; border: 1.5px solid; margin: 6px 6px 0 0;
      font-size: 0.85rem; background: var(--chip);}
.sig {display: flex; gap: 8px; margin: 6px 0; font-size: 0.95rem;}
.sig .kind {flex: none; font-size: 0.75rem; padding: 1px 8px; border-radius: 6px; height: fit-content; margin-top: 4px;}
.k-印证 {background: var(--ok-bg); color: var(--ok);}
.k-张力 {background: var(--warn-bg); color: var(--warn);}
.score {font-size: 2.6rem; font-weight: 700; line-height: 1;}
.muted {color: var(--muted); font-size: 0.85rem;}
.blabel {font-size: 0.875rem; margin-bottom: 0;}
.sign-badge {padding: 10px 14px; border-radius: 12px; background: var(--badge); border: 1px solid var(--card-line);
             margin: 4px 0 8px 0;}
.src {display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 0.7rem;}
.src .pill {display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 0.85rem; font-weight: 600;}
.src .ai {background: linear-gradient(90deg, var(--ai-a), var(--ai-b)); color: var(--ai);}
.src .tpl {background: var(--tpl-bg); color: var(--tpl);}
.src .note {color: var(--muted); font-size: 0.8rem;}
""" + accent_rules() + "</style>\n"


# ---------- 配置 ----------

def _secret(name: str, default: str | None = None) -> str | None:
    try:
        value = st.secrets.get(name)
    except Exception:  # 本地没有 secrets.toml 时会报错，当作没配置
        value = None
    return value or os.environ.get(name) or default


def llm_config() -> LLMConfig | None:
    key = _secret("DEEPSEEK_API_KEY") or _secret("LLM_API_KEY")
    if not key_looks_valid(key):  # 没填，或者还是占位文字
        return None
    return LLMConfig(
        api_key=key,
        base_url=_secret("LLM_BASE_URL", DEFAULT_BASE_URL),
        model=_secret("LLM_MODEL", DEFAULT_MODEL),
    )


SITE_URL = _secret("SITE_URL")
log = logging.getLogger("app")


def _ask_limit() -> int:
    try:
        return max(0, int(_secret("ASK_LIMIT", "3")))
    except ValueError:
        return 3


ASK_LIMIT = _ask_limit()  # 每位访客每次最多向 AI 提几个问题
SUGGESTIONS = set(SINGLE_SUGGESTIONS) | set(PAIR_SUGGESTIONS)


@st.cache_resource
def report_store() -> SharedCache:
    """所有访客共用的报告缓存：同一个组合只调用一次大模型，两个人同时点也只扣一次费。"""
    return SharedCache()


def get_single(type_code: str, sign_key: str) -> dict:
    def make():
        cfg = llm_config()
        r = generate_single(type_code, sign_key, cfg)
        return r, r["source"] == "ai" or cfg is None  # AI 偶尔失败时不缓存模板结果，下次再试

    return report_store().get_or_make(("single", type_code, sign_key), make)


def get_pair(a: Person, b: Person) -> dict:
    def make():
        cfg = llm_config()
        r = generate_pair(a, b, cfg)
        return r, r["source"] == "ai" or cfg is None

    return report_store().get_or_make(("pair", a, b), make)


# ---------- 小组件 ----------

def esc(text: str) -> str:
    return html.escape(str(text))


def source_badge(source: str) -> str:
    """报告顶部的来源标识：一眼看出这份报告是不是 AI 写的。"""
    if source == "ai":
        return ("<div class='src'><span class='pill ai'>✨ AI 解读</span>"
                "<span class='note'>下面的文字由 AI 根据资料库为你写成</span></div>")
    return ("<div class='src'><span class='pill tpl'>📖 资料库解读</span>"
            "<span class='note'>AI 暂时不可用，先用资料库为你拼出这份报告</span></div>")


def type_label(code: str) -> str:
    return f"{code} · {get_type(code)['nickname']}"


def birthday_input(label: str, key: str):
    """年份输入框默认 1990（可以直接改，也可以点加减），月和日从下拉框选；没选完就不算星座。"""
    st.markdown(f"<div class='blabel'>{esc(label)}<span class='muted'>　年份点一下就能改</span></div>",
                unsafe_allow_html=True)
    with st.container(horizontal=True, gap="small", wrap=False):
        year = st.number_input(f"{label}·年", min_value=MIN_DATE.year, max_value=TODAY.year, value=DEFAULT_YEAR,
                               step=1, key=f"{key}_y", label_visibility="collapsed", width=120)
        month = st.selectbox(f"{label}·月", range(1, 13), index=None, placeholder="月", key=f"{key}_m",
                             format_func=lambda v: f"{v} 月", label_visibility="collapsed")
        day = st.selectbox(f"{label}·日", range(1, 32), index=None, placeholder="日", key=f"{key}_d",
                           format_func=lambda v: f"{v} 日", label_visibility="collapsed")
    d, problem = make_birthday(year, month, day, TODAY)
    if problem:
        st.warning(problem)
    if d is None:
        return None, None
    sign = sun_sign(d)
    accent = accent_class(sign["element"])
    st.markdown(
        f"<div class='sign-badge'>星座：<b class='{accent}'>{esc(sign['name'])} {sign['symbol']}</b>"
        f"　{esc(sign['element'])}象 · {esc(sign['modality'])}星座 · {esc(sign['dates'])}</div>",
        unsafe_allow_html=True,
    )
    note = cusp_note(d)
    if note:
        st.caption(note)
    return d, sign


def quiz_block() -> str | None:
    st.caption("每题选一个更像你的一边，凭第一感觉就好，大约 3 分钟。")
    labels = {1: "A", 2: "偏 A", 3: "中间", 4: "偏 B", 5: "B"}
    with st.form("quiz_form"):
        for i, item in enumerate(quiz_items(), start=1):
            st.markdown(f"**{i}. {esc(item['title'])}**")
            st.caption(f"A：{item['left']}　｜　B：{item['right']}")
            st.radio(
                f"第 {i} 题", options=[1, 2, 3, 4, 5], index=None, horizontal=True,
                format_func=labels.get, key=f"q{item['id']}", label_visibility="collapsed",
            )
        submitted = st.form_submit_button("看看我的类型", type="primary", width="stretch")
    if submitted:
        answers = {it["id"]: st.session_state.get(f"q{it['id']}") for it in quiz_items()}
        missing = [n for n, it in enumerate(quiz_items(), start=1) if answers[it["id"]] is None]
        if missing:
            st.warning(f"还有 {len(missing)} 题没选哦（第 {', '.join(map(str, missing[:6]))}{' …' if len(missing) > 6 else ''} 题）。")
        else:
            st.session_state["quiz_result"] = quiz.score(answers)
    st.caption(quiz.ATTRIBUTION)

    result = st.session_state.get("quiz_result")
    if not result:
        return None
    code = result["type"]
    st.success(f"你的快测结果是 **{type_label(code)}**")
    for dim in quiz.ORDER:
        left, right = quiz.POLES[dim]
        pct = result["percents"][dim]
        st.caption(f"{left} {pct[left]}%　·　{right} {pct[right]}%")
        st.progress(pct[right] / 100)
    return code


def type_picker(key: str, allow_quiz: bool) -> str | None:
    mode = "know"
    if allow_quiz:
        mode = st.radio(
            "你的 16 型人格", ["know", "quiz"], horizontal=True, key=f"{key}_mode",
            format_func={"know": "我知道我的类型", "quiz": "不知道，做 32 题快测"}.get,
        )
    if mode == "quiz":
        return quiz_block()
    return st.selectbox(
        "选择类型" if allow_quiz else "16 型人格", TYPE_CODES, index=None, format_func=type_label,
        placeholder="选择类型", key=f"{key}_type",
    )


def footnote(source: str) -> None:
    if source == "ai":
        st.caption("本报告由 AI 根据资料库生成，仅供娱乐参考。")
    else:
        st.caption("本报告根据资料库自动生成（AI 暂时不可用），仅供娱乐参考。")


def md_escape(text: str) -> str:
    """用户输入的问题原样显示，不让 # * 之类的符号变成格式。"""
    return re.sub(r"([\\`*_{}\[\]()#+\-.!|>~<])", r"\\\1", text)


def ask_answer(scope: str, question: str, ask: Callable[[str], str]) -> str:
    """推荐问题的回答所有访客共用，同一组合只问一次 AI；自己输入的问题不缓存、不保存。"""
    if question not in SUGGESTIONS:
        return ask(question)
    return report_store().get_or_make(("ask", scope, question), lambda: (ask(question), True))


def ask_block(scope: str, ask: Callable[[str], str], suggestions: tuple[str, ...], placeholder: str) -> None:
    if ASK_LIMIT <= 0:  # Secrets 里 ASK_LIMIT = 0 表示关掉提问
        return
    st.markdown("#### 💬 问问 AI")
    if llm_config() is None:
        st.caption("配置好 AI Key 之后，这里可以结合你的组合向 AI 提问。")
        return
    history = st.session_state.setdefault("ask_history", {}).setdefault(scope, [])
    for q, a in history:
        with st.chat_message("user"):
            st.markdown(md_escape(q))
        with st.chat_message("assistant", avatar="🌙"):
            st.markdown(a)
    left = ASK_LIMIT - st.session_state.get("ask_used", 0)
    if left <= 0:
        st.caption(f"这次的 {ASK_LIMIT} 个问题已经问完啦，谢谢你愿意和 AI 聊聊。")
        return
    st.caption(f"AI 会结合你们的组合来回答，这次还可以问 {left} 个。" if scope.startswith("pair")
               else f"AI 会结合你的组合来回答，这次还可以问 {left} 个。")
    question = None
    asked = {q for q, _ in history}
    for s in suggestions:
        if s not in asked and st.button(s, key=f"ask_{scope}_{s}"):
            question = s
    with st.form(f"ask_form_{scope}", clear_on_submit=True, border=False):
        text = st.text_input("自己问一个问题", max_chars=MAX_QUESTION, placeholder=placeholder)
        if st.form_submit_button("问 AI", type="primary", width="stretch"):
            question = clean_question(text) or None
            if question is None:
                st.caption("先写下你的问题吧。")
    st.caption("问题只用来生成这次的回答，不会被保存。请不要写姓名、电话等个人信息。")
    if not question:
        return
    with st.spinner("AI 正在想怎么回答你…"):
        try:
            answer = ask_answer(scope, question, ask)
        except Exception as e:  # AI 出任何问题都不能让网站报错，这次也不算次数
            log.warning("问问 AI 失败：%s", e)
            st.warning("AI 这次没有回上来，过一会儿再问一次吧，这次不算次数。")
            return
    history.append((question, answer))
    st.session_state["ask_used"] = st.session_state.get("ask_used", 0) + 1
    st.rerun()


def share_block(png: bytes, filename: str) -> None:
    st.markdown("#### 分享图")
    st.image(png, width="stretch")
    st.caption("手机上可以长按图片保存，或者点下面的按钮下载。")
    st.download_button("保存分享图", data=png, file_name=filename, mime="image/png",
                       on_click="ignore", type="primary", width="stretch")


# ---------- 报告展示 ----------

def render_single(r: dict) -> None:
    accent = accent_class(r["sign"]["element"])
    tags = "".join(f"<span class='tag {accent}'>{esc(k)}</span>" for k in r["keywords"])
    st.markdown(
        f"<div class='rcard headline'>{source_badge(r['source'])}<div class='label'>{esc(r['label'])}</div>"
        f"<div class='nick {accent}'>{esc(r['nickname'])}</div>"
        f"<p>{esc(r['one_liner'])}</p>{tags}</div>",
        unsafe_allow_html=True,
    )
    sigs = "".join(
        f"<div class='sig'><span class='kind k-{s['kind']}'>{s['kind']}</span><span>{esc(s['text'])}</span></div>"
        for s in r["signals"]
    )
    st.markdown(
        f"<div class='rcard'><h4 class='{accent}'>性格核心</h4><p>{esc(r['core'])}</p>"
        f"<p class='muted' style='margin-top:0.8rem'>两套体系的对照</p>{sigs}</div>",
        unsafe_allow_html=True,
    )
    strengths = "".join(f"<li>{esc(x)}</li>" for x in r["strengths"])
    blindspots = "".join(f"<li>{esc(x)}</li>" for x in r["blindspots"])
    st.markdown(
        f"<div class='rcard'><h4 class='{accent}'>优势与盲点</h4>"
        f"<p><b>你的闪光点</b></p><ul>{strengths}</ul>"
        f"<p style='margin-top:0.6rem'><b>可以温柔对待的地方</b></p><ul>{blindspots}</ul></div>",
        unsafe_allow_html=True,
    )
    for title, key in (("恋爱与人际", "love"), ("工作与学习", "work")):
        st.markdown(f"<div class='rcard'><h4 class='{accent}'>{title}</h4><p>{esc(r[key])}</p></div>",
                    unsafe_allow_html=True)
    matches = "".join(f"<li><b>{esc(m['combo'])}</b>：{esc(m['reason'])}</li>" for m in r["matches"])
    st.markdown(f"<div class='rcard'><h4 class='{accent}'>最合拍的组合</h4><ul>{matches}</ul></div>",
                unsafe_allow_html=True)
    st.markdown(f"<div class='rcard' style='text-align:center'><h4 class='{accent}'>写给你</h4>"
                f"<p>「{esc(r['hug'])}」</p></div>", unsafe_allow_html=True)
    footnote(r["source"])


def render_pair(r: dict) -> None:
    accent = accent_class(r["a"]["element"])
    st.markdown(
        f"<div class='rcard headline'>{source_badge(r['source'])}"
        f"<p class='muted'>你{esc(r['a']['label'])}（{esc(r['a']['nickname'])}）<br>"
        f"TA　{esc(r['b']['label'])}（{esc(r['b']['nickname'])}）</p>"
        f"<div class='label {accent}'>{esc(r['title'])}</div>"
        f"<p>默契指数 <span class='score {accent}'>{r['score']}</span></p>"
        f"<p>{esc(r['one_liner'])}</p></div>",
        unsafe_allow_html=True,
    )
    st.markdown(f"<div class='rcard'><h4 class='{accent}'>你们的化学反应</h4><p>{esc(r['chemistry'])}</p></div>",
                unsafe_allow_html=True)
    hl = "".join(f"<li>{esc(x)}</li>" for x in r["highlights"])
    st.markdown(f"<div class='rcard'><h4 class='{accent}'>相处亮点</h4><ul>{hl}</ul></div>",
                unsafe_allow_html=True)
    fr = "".join(f"<li><b>{esc(x['point'])}</b><br>小建议：{esc(x['tip'])}</li>" for x in r["frictions"])
    st.markdown(f"<div class='rcard'><h4 class='{accent}'>可能的小摩擦</h4><ul>{fr}</ul></div>",
                unsafe_allow_html=True)
    st.markdown(f"<div class='rcard'><h4 class='{accent}'>适合你们的相处方式</h4><p>{esc(r['date_idea'])}</p></div>",
                unsafe_allow_html=True)
    st.markdown(f"<div class='rcard' style='text-align:center'><h4 class='{accent}'>写给你们</h4>"
                f"<p>「{esc(r['hug'])}」</p></div>", unsafe_allow_html=True)
    footnote(r["source"])


# ---------- 页面 ----------

def single_tab() -> None:
    _, sign = birthday_input("你的生日（公历）", key="me_birthday")
    code = type_picker("me", allow_quiz=True)
    ready = bool(sign and code)
    ai_on = llm_config() is not None
    label = "生成我的 AI 解读" if ai_on else "生成我的报告"
    if st.button(label, type="primary", width="stretch", disabled=not ready, key="go_single"):
        with st.spinner("AI 正在为你写解读，大约 10 秒…" if ai_on else "正在为你生成报告…"):
            r = get_single(code, sign["key"])
            st.session_state["single"] = {"report": r, "png": single_card(r, site=SITE_URL)}
    if not ready:
        st.caption("选好生日和类型后，就可以生成报告啦。")

    out = st.session_state.get("single")
    if out:
        st.divider()
        r = out["report"]
        render_single(r)
        ask_block(f"single:{r['type_code']}:{r['sign_key']}",
                  lambda q: ask_single(r["type_code"], r["sign_key"], q, llm_config()),
                  SINGLE_SUGGESTIONS, "比如：我该怎么面对拖延？")
        share_block(out["png"], f"{out['report']['type_code']}x{out['report']['sign_key']}座.png")


def pair_tab() -> None:
    st.caption("不知道类型的话，可以先去「我的解读」做个快测。")
    with st.container(border=True):
        st.markdown("**你**")
        _, sign_a = birthday_input("你的生日（公历）", key="a_birthday")
        code_a = type_picker("a", allow_quiz=False)
    with st.container(border=True):
        st.markdown("**TA**")
        _, sign_b = birthday_input("TA 的生日（公历）", key="b_birthday")
        code_b = type_picker("b", allow_quiz=False)
    ready = bool(sign_a and code_a and sign_b and code_b)
    if st.button("看看我们的默契", type="primary", width="stretch", disabled=not ready, key="go_pair"):
        with st.spinner("AI 正在为你们写配对解读，大约 10 秒…" if llm_config() else "正在为你们生成配对报告…"):
            a, b = Person(code_a, sign_a["key"]), Person(code_b, sign_b["key"])
            r = get_pair(a, b)
            st.session_state["pair"] = {"report": r, "png": pair_card(r, site=SITE_URL), "people": (a, b)}
    if not ready:
        st.caption("填好两个人的生日和类型后，就可以看配对啦。")

    out = st.session_state.get("pair")
    if out:
        st.divider()
        render_pair(out["report"])
        a, b = out["people"]
        ask_block(f"pair:{a.type_code}{a.sign_key}:{b.type_code}{b.sign_key}",
                  lambda q: ask_pair(a, b, q, llm_config()),
                  PAIR_SUGGESTIONS, "比如：TA 不爱说话的时候，我该怎么办？")
        share_block(out["png"], "双人配对.png")


def main() -> None:
    st.markdown(CSS, unsafe_allow_html=True)
    sub = "把两套性格语言放在一起，让 AI 温柔地读懂你" if llm_config() else "把两套性格语言放在一起，温柔地读懂你自己"
    st.markdown(
        f"<div class='hero'><div class='title'>🌙 16 型人格 × 星座</div><div class='sub'>{sub}</div></div>",
        unsafe_allow_html=True,
    )
    tab_me, tab_pair = st.tabs(["我的解读", "双人配对"])
    with tab_me:
        single_tab()
    with tab_pair:
        pair_tab()

    st.divider()
    with st.expander("这是怎么算出来的？"):
        st.markdown(
            "- 星座：按公历生日计算太阳星座。\n"
            "- 组合规则：把 16 型人格的四个维度和星座的元素、模式一一对照，找出互相印证和有张力的地方。\n"
            "- 报告：资料库里的文字都是我们自己写的，AI 只负责把这些依据写成更好读的报告。\n"
            + (f"- 问问 AI：AI 结合你的组合回答问题，每次最多问 {ASK_LIMIT} 个；问题不会被保存。\n" if ASK_LIMIT else "")
            + "- 双人配对的「默契指数」只是一个好玩的参考，不代表两个人合不合适。"
        )
    st.caption("仅供娱乐，不构成任何专业建议。生日只用来计算星座，不会被保存。右上角 ⋮ 可以切换浅色 / 深色。")


main()
