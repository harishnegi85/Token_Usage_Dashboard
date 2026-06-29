import random
from datetime import date, timedelta
from typing import List, Dict, Any

# Seed for reproducibility
SEED = 42

USERS = [
    "alice@accenture.com",
    "bob@accenture.com",
    "carol@accenture.com",
    "david@accenture.com",
    "eve@accenture.com",
    "frank@accenture.com",
    "grace@accenture.com",
    "henry@accenture.com",
    "iris@accenture.com",
    "james@accenture.com",
]

MODELS = [
    "claude-haiku-4-5",
    "claude-sonnet-4-6",
    "claude-opus-4-8",
]

# Pricing per million tokens
PRICING = {
    "claude-haiku-4-5": {
        "input": 0.80,
        "output": 4.00,
        "cache_read": 0.08,
        "cache_write": 1.00,
    },
    "claude-sonnet-4-6": {
        "input": 3.00,
        "output": 15.00,
        "cache_read": 0.30,
        "cache_write": 3.75,
    },
    "claude-opus-4-8": {
        "input": 15.00,
        "output": 75.00,
        "cache_read": 1.50,
        "cache_write": 18.75,
    },
}

# Token ranges per model per request
TOKEN_RANGES = {
    "claude-haiku-4-5": {"input": (500, 3000), "output": (100, 800)},
    "claude-sonnet-4-6": {"input": (1000, 8000), "output": (200, 2000)},
    "claude-opus-4-8": {"input": (2000, 15000), "output": (300, 3000)},
}

# User profiles: (activity_rate, models_weights, cache_hit_profile, request_multiplier)
# cache_hit_profile: (min_cache_pct, max_cache_pct)
USER_PROFILES = {
    "alice@accenture.com": {
        "activity_rate": 0.95,
        "model_weights": [0.3, 0.5, 0.2],
        "cache_hit_range": (0.35, 0.65),
        "cache_write_frac": 0.05,
        "request_multiplier": 2.0,  # high usage
    },
    "bob@accenture.com": {
        "activity_rate": 0.90,
        "model_weights": [0.4, 0.45, 0.15],
        "cache_hit_range": (0.30, 0.55),
        "cache_write_frac": 0.04,
        "request_multiplier": 1.8,  # high usage
    },
    "carol@accenture.com": {
        "activity_rate": 0.75,
        "model_weights": [0.5, 0.4, 0.1],
        "cache_hit_range": (0.0, 0.02),  # zero caching - optimization target
        "cache_write_frac": 0.01,
        "request_multiplier": 1.2,
    },
    "david@accenture.com": {
        "activity_rate": 0.70,
        "model_weights": [0.5, 0.4, 0.1],
        "cache_hit_range": (0.20, 0.40),
        "cache_write_frac": 0.04,
        "request_multiplier": 1.0,
    },
    "eve@accenture.com": {
        "activity_rate": 0.80,
        "model_weights": [0.1, 0.2, 0.7],  # very high opus - optimization target
        "cache_hit_range": (0.10, 0.25),
        "cache_write_frac": 0.03,
        "request_multiplier": 1.3,
    },
    "frank@accenture.com": {
        "activity_rate": 0.85,
        "model_weights": [0.35, 0.5, 0.15],
        "cache_hit_range": (0.60, 0.85),  # great cache hit rate
        "cache_write_frac": 0.08,
        "request_multiplier": 1.4,
    },
    "grace@accenture.com": {
        "activity_rate": 0.65,
        "model_weights": [0.6, 0.35, 0.05],
        "cache_hit_range": (0.25, 0.45),
        "cache_write_frac": 0.04,
        "request_multiplier": 0.9,
    },
    "henry@accenture.com": {
        "activity_rate": 0.60,
        "model_weights": [0.45, 0.45, 0.10],
        "cache_hit_range": (0.15, 0.35),
        "cache_write_frac": 0.03,
        "request_multiplier": 0.85,
    },
    "iris@accenture.com": {
        "activity_rate": 0.55,
        "model_weights": [0.55, 0.35, 0.10],
        "cache_hit_range": (0.20, 0.40),
        "cache_write_frac": 0.04,
        "request_multiplier": 0.8,
    },
    "james@accenture.com": {
        "activity_rate": 0.50,
        "model_weights": [0.50, 0.40, 0.10],
        "cache_hit_range": (0.10, 0.30),
        "cache_write_frac": 0.03,
        "request_multiplier": 0.75,
    },
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int,
                   cache_read_tokens: int, cache_write_tokens: int) -> float:
    p = PRICING[model]
    cost = (
        input_tokens * p["input"] / 1_000_000
        + output_tokens * p["output"] / 1_000_000
        + cache_read_tokens * p["cache_read"] / 1_000_000
        + cache_write_tokens * p["cache_write"] / 1_000_000
    )
    return round(cost, 6)


def generate_records() -> List[Dict[str, Any]]:
    rng = random.Random(SEED)
    records = []

    end_date = date(2026, 6, 28)
    start_date = end_date - timedelta(days=29)

    for day_offset in range(30):
        current_date = start_date + timedelta(days=day_offset)
        date_str = current_date.isoformat()

        for user_id in USERS:
            profile = USER_PROFILES[user_id]

            # Check if user is active today
            if rng.random() > profile["activity_rate"]:
                continue

            # Determine which models user uses today
            for model_idx, model in enumerate(MODELS):
                model_weight = profile["model_weights"][model_idx]

                # Probability of using this model today
                if rng.random() > model_weight * 1.3:
                    continue

                # Number of requests for this model today
                base_requests = rng.randint(1, 20)
                request_count = max(1, int(base_requests * profile["request_multiplier"]))

                # Aggregate tokens across requests
                total_input = 0
                total_output = 0
                total_cache_read = 0
                total_cache_write = 0

                input_range = TOKEN_RANGES[model]["input"]
                output_range = TOKEN_RANGES[model]["output"]
                cache_hit_min, cache_hit_max = profile["cache_hit_range"]

                for _ in range(request_count):
                    input_tok = rng.randint(*input_range)
                    output_tok = rng.randint(*output_range)

                    # Cache read: fraction of input tokens
                    cache_hit_rate = rng.uniform(cache_hit_min, cache_hit_max)
                    cache_read_tok = int(input_tok * cache_hit_rate)

                    # Cache write: small fraction of input
                    cache_write_tok = int(input_tok * profile["cache_write_frac"] * rng.uniform(0.5, 1.5))

                    total_input += input_tok
                    total_output += output_tok
                    total_cache_read += cache_read_tok
                    total_cache_write += cache_write_tok

                cost = calculate_cost(model, total_input, total_output, total_cache_read, total_cache_write)

                records.append({
                    "date": date_str,
                    "user_id": user_id,
                    "model": model,
                    "input_tokens": total_input,
                    "output_tokens": total_output,
                    "cache_read_tokens": total_cache_read,
                    "cache_write_tokens": total_cache_write,
                    "request_count": request_count,
                    "cost_usd": cost,
                })

    return records


# Cache the generated records
_records_cache: List[Dict[str, Any]] = []


def get_all_records() -> List[Dict[str, Any]]:
    global _records_cache
    if not _records_cache:
        _records_cache = generate_records()
    return _records_cache
