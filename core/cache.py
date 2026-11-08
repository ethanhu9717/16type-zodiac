"""所有访客共用的结果缓存。

同一个 key 同时只让一个人去算（调用 AI），其他同时到的人等它算完直接用结果，
这样两个人同时点同一个组合也只扣一次费。
"""

from __future__ import annotations

import threading
from typing import Any, Callable, Hashable


class SharedCache:
    def __init__(self) -> None:
        self._data: dict[Hashable, Any] = {}
        self._guard = threading.Lock()
        self._locks: dict[Hashable, threading.Lock] = {}

    def __contains__(self, key: Hashable) -> bool:
        return key in self._data

    def get_or_make(self, key: Hashable, make: Callable[[], tuple[Any, bool]]) -> Any:
        """有缓存就直接返回；没有就调用 make()，它返回 (结果, 要不要缓存)。make 出错时不缓存，错误照常抛出。"""
        if key in self._data:
            return self._data[key]
        with self._guard:
            lock = self._locks.setdefault(key, threading.Lock())
        with lock:
            if key in self._data:  # 等锁的时候别人已经算好了
                return self._data[key]
            value, keep = make()
            if keep:
                self._data[key] = value
            return value
