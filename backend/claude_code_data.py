import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from collections import defaultdict

from mock_data import PRICING

CLAUDE_HOME = Path.home() / ".claude" / "projects"
USER_ID = "harish.a.negi@accenture.com"

# Normalize model names from Claude Code to our canonical set
_ACTIVITY_KEYWORDS: list[tuple[str, str]] = [
    ("security", "Testing"),
    ("test", "Testing"),
    ("qa", "Testing"),
    ("debug", "Testing"),
    ("research", "Research"),
    ("optimize", "Research"),
    ("analysis", "Research"),
    ("requirement", "Requirements"),
    ("spec", "Requirements"),
    ("doc", "Requirements"),
]


def _classify_activity(project_folder: str) -> str:
    name = project_folder.lower()
    for keyword, activity in _ACTIVITY_KEYWORDS:
        if keyword in name:
            return activity
    return "Development"


_KNOWN_MODELS = {
    "claude-haiku-4-5": "claude-haiku-4-5",
    "claude-sonnet-4-6": "claude-sonnet-4-6",
    "claude-opus-4-8": "claude-opus-4-8",
    "claude-opus-4-7": "claude-opus-4-8",
    "claude-opus-4-6": "claude-opus-4-8",
}


def _normalize_model(model: str) -> Optional[str]:
    if model in _KNOWN_MODELS:
        return _KNOWN_MODELS[model]
    # Prefix match (e.g. "claude-haiku-4-5-20251001")
    for prefix, canonical in _KNOWN_MODELS.items():
        if model.startswith(prefix):
            return canonical
    if "haiku" in model:
        return "claude-haiku-4-5"
    if "sonnet" in model:
        return "claude-sonnet-4-6"
    if "opus" in model:
        return "claude-opus-4-8"
    return None


def _cost(model: str, input_tok: int, output_tok: int,
          cache_read: int, cache_write: int) -> float:
    if model not in PRICING:
        return 0.0
    p = PRICING[model]
    return round(
        input_tok * p["input"] / 1_000_000
        + output_tok * p["output"] / 1_000_000
        + cache_read * p["cache_read"] / 1_000_000
        + cache_write * p["cache_write"] / 1_000_000,
        6,
    )


_cache: List[Dict[str, Any]] = []


def get_real_records() -> List[Dict[str, Any]]:
    """Read all Claude Code local JSONL sessions and return usage records."""
    global _cache
    if _cache:
        return _cache

    if not CLAUDE_HOME.exists():
        return []

    # (date_str, model, activity) → aggregated stats
    daily: Dict[tuple, Dict[str, Any]] = defaultdict(lambda: {
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_read_tokens": 0,
        "cache_write_tokens": 0,
        "request_count": 0,
    })

    seen: set = set()  # deduplicate by (requestId, model)

    for jsonl_path in CLAUDE_HOME.rglob("*.jsonl"):
        if jsonl_path.name.startswith("agent-"):
            continue
        activity = _classify_activity(jsonl_path.parent.name)
        try:
            with open(jsonl_path, "r", encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    if entry.get("type") != "assistant":
                        continue

                    msg = entry.get("message", {})
                    raw_model = msg.get("model", "")
                    if not raw_model or raw_model == "<synthetic>":
                        continue

                    model = _normalize_model(raw_model)
                    if model is None:
                        continue

                    usage = msg.get("usage", {})
                    input_tok = usage.get("input_tokens", 0) or 0
                    output_tok = usage.get("output_tokens", 0) or 0
                    cache_write = usage.get("cache_creation_input_tokens", 0) or 0
                    cache_read = usage.get("cache_read_input_tokens", 0) or 0

                    if input_tok == 0 and output_tok == 0:
                        continue

                    # Deduplicate: same API call recorded multiple times per turn
                    req_id = entry.get("requestId", "")
                    if req_id:
                        key = (req_id, model)
                        if key in seen:
                            continue
                        seen.add(key)

                    ts = entry.get("timestamp", "")
                    try:
                        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                        date_str = dt.date().isoformat()
                    except (ValueError, AttributeError):
                        continue

                    agg = daily[(date_str, model, activity)]
                    agg["input_tokens"] += input_tok
                    agg["output_tokens"] += output_tok
                    agg["cache_read_tokens"] += cache_read
                    agg["cache_write_tokens"] += cache_write
                    agg["request_count"] += 1

        except (OSError, PermissionError):
            continue

    records = []
    for (date_str, model, act), stats in daily.items():
        records.append({
            "date": date_str,
            "user_id": USER_ID,
            "model": model,
            "activity": act,
            "input_tokens": stats["input_tokens"],
            "output_tokens": stats["output_tokens"],
            "cache_read_tokens": stats["cache_read_tokens"],
            "cache_write_tokens": stats["cache_write_tokens"],
            "request_count": stats["request_count"],
            "cost_usd": _cost(
                model,
                stats["input_tokens"],
                stats["output_tokens"],
                stats["cache_read_tokens"],
                stats["cache_write_tokens"],
            ),
        })

    _cache = records
    return _cache
