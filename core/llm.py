"""调用 OpenAI 兼容接口（默认 DeepSeek），要求返回 JSON。"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

import requests

DEFAULT_BASE_URL = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-chat"


class LLMError(RuntimeError):
    pass


@dataclass(frozen=True)
class LLMConfig:
    api_key: str
    base_url: str = DEFAULT_BASE_URL
    model: str = DEFAULT_MODEL
    timeout: float = 60.0
    temperature: float = 1.0


def parse_json(text: str) -> dict:
    """从模型回复里取出 JSON 对象，容忍 ```json 代码块和前后多余的文字。"""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise LLMError("回复里没有 JSON")
    try:
        data = json.loads(text[start:end + 1])
    except json.JSONDecodeError as e:
        raise LLMError(f"JSON 解析失败：{e}") from e
    if not isinstance(data, dict):
        raise LLMError("回复不是 JSON 对象")
    return data


def key_looks_valid(key: str | None) -> bool:
    """Key 只能是英文字母、数字和符号；还是占位文字或含中文时当作没配置。"""
    k = (key or "").strip()
    return bool(k) and k.isascii() and " " not in k


def chat_json(cfg: LLMConfig, system: str, user: str) -> dict:
    if not key_looks_valid(cfg.api_key):
        raise LLMError("API Key 格式不对（可能还是占位文字）")
    url = cfg.base_url.rstrip("/") + "/chat/completions"
    payload = {
        "model": cfg.model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": cfg.temperature,
        "max_tokens": 2000,
        "response_format": {"type": "json_object"},
    }
    try:
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {cfg.api_key.strip()}", "Content-Type": "application/json"},
            json=payload,
            timeout=(10, cfg.timeout),
        )
    except (requests.RequestException, UnicodeError, ValueError) as e:
        raise LLMError(f"请求失败：{type(e).__name__}") from e
    if resp.status_code != 200:
        raise LLMError(f"接口返回 HTTP {resp.status_code}")
    try:
        content = resp.json()["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise LLMError("接口返回格式不对") from e
    return parse_json(content or "")
