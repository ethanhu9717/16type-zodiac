import threading
import time

import pytest

from core.cache import SharedCache


def test_concurrent_callers_make_once():
    cache, calls = SharedCache(), []

    def make():
        calls.append(1)
        time.sleep(0.2)  # 模拟 AI 调用需要时间
        return "报告", True

    results = []
    threads = [threading.Thread(target=lambda: results.append(cache.get_or_make("k", make))) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len(calls) == 1
    assert results == ["报告"] * 5


def test_not_kept_results_are_retried():
    cache, calls = SharedCache(), []

    def make():
        calls.append(1)
        return "模板", False

    assert cache.get_or_make("k", make) == "模板"
    assert cache.get_or_make("k", make) == "模板"
    assert len(calls) == 2 and "k" not in cache


def test_error_is_not_cached():
    cache = SharedCache()

    def boom():
        raise RuntimeError("AI 失败")

    with pytest.raises(RuntimeError):
        cache.get_or_make("k", boom)
    assert cache.get_or_make("k", lambda: ("好了", True)) == "好了"
    assert cache.get_or_make("k", boom) == "好了"


def test_different_keys_do_not_wait_for_each_other():
    cache = SharedCache()
    started = threading.Event()
    release = threading.Event()

    def slow():
        started.set()
        release.wait(2)
        return "慢", True

    t = threading.Thread(target=lambda: cache.get_or_make("a", slow))
    t.start()
    started.wait(2)
    t0 = time.time()
    assert cache.get_or_make("b", lambda: ("快", True)) == "快"
    assert time.time() - t0 < 0.5
    release.set()
    t.join()
