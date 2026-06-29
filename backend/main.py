from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from collections import defaultdict
from datetime import date, timedelta

from mock_data import get_all_records, MODELS, PRICING

app = FastAPI(title="Token Usage Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_period(period: str) -> int:
    """Parse period string like '30d' into number of days."""
    if period.endswith("d"):
        return int(period[:-1])
    return 30


def get_records_for_period(days: int) -> List[Dict[str, Any]]:
    all_records = get_all_records()
    end_date = date(2026, 6, 28)
    start_date = end_date - timedelta(days=days - 1)
    return [r for r in all_records if r["date"] >= start_date.isoformat()]


def get_records_for_previous_period(days: int) -> List[Dict[str, Any]]:
    all_records = get_all_records()
    end_date = date(2026, 6, 28)
    current_start = end_date - timedelta(days=days - 1)
    prev_end = current_start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)
    return [r for r in all_records if prev_start.isoformat() <= r["date"] <= prev_end.isoformat()]


@app.get("/api/overview")
async def get_overview(period: str = "30d"):
    days = parse_period(period)
    records = get_records_for_period(days)
    prev_records = get_records_for_previous_period(days)

    # Compute current period KPIs
    total_input = sum(r["input_tokens"] for r in records)
    total_output = sum(r["output_tokens"] for r in records)
    total_cache_read = sum(r["cache_read_tokens"] for r in records)
    total_cache_write = sum(r["cache_write_tokens"] for r in records)
    total_tokens = total_input + total_output + total_cache_read + total_cache_write
    total_cost = sum(r["cost_usd"] for r in records)
    total_requests = sum(r["request_count"] for r in records)
    active_users = len(set(r["user_id"] for r in records))

    # Cache hit rate: cache_read / (input + cache_read)
    denom = total_input + total_cache_read
    cache_hit_rate = total_cache_read / denom if denom > 0 else 0.0

    avg_tokens_per_request = (total_input + total_output) / total_requests if total_requests > 0 else 0.0

    # Previous period KPIs
    prev_total_tokens = sum(
        r["input_tokens"] + r["output_tokens"] + r["cache_read_tokens"] + r["cache_write_tokens"]
        for r in prev_records
    )
    prev_total_cost = sum(r["cost_usd"] for r in prev_records)

    def delta_pct(current: float, previous: float) -> float:
        if previous == 0:
            return 0.0
        return round((current - previous) / previous * 100, 2)

    # Build time series
    daily_data: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "haiku_tokens": 0,
        "sonnet_tokens": 0,
        "opus_tokens": 0,
        "total_cost": 0.0,
    })

    for r in records:
        d = r["date"]
        tokens = r["input_tokens"] + r["output_tokens"] + r["cache_read_tokens"] + r["cache_write_tokens"]
        if r["model"] == "claude-haiku-4-5":
            daily_data[d]["haiku_tokens"] += tokens
        elif r["model"] == "claude-sonnet-4-6":
            daily_data[d]["sonnet_tokens"] += tokens
        elif r["model"] == "claude-opus-4-8":
            daily_data[d]["opus_tokens"] += tokens
        daily_data[d]["total_cost"] += r["cost_usd"]

    time_series = [
        {
            "date": d,
            "haiku_tokens": daily_data[d]["haiku_tokens"],
            "sonnet_tokens": daily_data[d]["sonnet_tokens"],
            "opus_tokens": daily_data[d]["opus_tokens"],
            "total_cost": round(daily_data[d]["total_cost"], 4),
        }
        for d in sorted(daily_data.keys())
    ]

    return {
        "kpis": {
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_cost, 2),
            "active_users": active_users,
            "cache_hit_rate": round(cache_hit_rate, 4),
            "avg_tokens_per_request": round(avg_tokens_per_request, 1),
            "period_vs_previous": {
                "total_tokens_delta_pct": delta_pct(total_tokens, prev_total_tokens),
                "total_cost_delta_pct": delta_pct(total_cost, prev_total_cost),
            },
        },
        "time_series": time_series,
    }


def compute_user_summary(user_id: str, records: List[Dict[str, Any]]) -> Dict[str, Any]:
    user_records = [r for r in records if r["user_id"] == user_id]

    if not user_records:
        return {}

    total_input = sum(r["input_tokens"] for r in user_records)
    total_output = sum(r["output_tokens"] for r in user_records)
    total_cache_read = sum(r["cache_read_tokens"] for r in user_records)
    total_cache_write = sum(r["cache_write_tokens"] for r in user_records)
    total_tokens = total_input + total_output + total_cache_read + total_cache_write
    cost_usd = sum(r["cost_usd"] for r in user_records)
    request_count = sum(r["request_count"] for r in user_records)

    denom = total_input + total_cache_read
    cache_hit_rate = total_cache_read / denom if denom > 0 else 0.0

    # Primary model by token volume
    model_tokens: Dict[str, int] = defaultdict(int)
    for r in user_records:
        tokens = r["input_tokens"] + r["output_tokens"] + r["cache_read_tokens"] + r["cache_write_tokens"]
        model_tokens[r["model"]] += tokens
    primary_model = max(model_tokens, key=lambda m: model_tokens[m]) if model_tokens else ""

    avg_input_tokens = total_input / request_count if request_count > 0 else 0.0
    avg_output_tokens = total_output / request_count if request_count > 0 else 0.0

    # Optimization flags
    optimization_flags = []
    if cache_hit_rate < 0.15 and avg_input_tokens > 1500:
        optimization_flags.append("low_cache_rate")
    if primary_model in ("claude-sonnet-4-6", "claude-opus-4-8") and avg_output_tokens < 400:
        optimization_flags.append("expensive_model")
    if avg_input_tokens > 6000 and cache_hit_rate < 0.3:
        optimization_flags.append("long_prompts")

    return {
        "user_id": user_id,
        "total_tokens": total_tokens,
        "input_tokens": total_input,
        "output_tokens": total_output,
        "cost_usd": round(cost_usd, 4),
        "primary_model": primary_model,
        "cache_hit_rate": round(cache_hit_rate, 4),
        "request_count": request_count,
        "optimization_flags": optimization_flags,
        "_avg_input_tokens": avg_input_tokens,
        "_avg_output_tokens": avg_output_tokens,
    }


@app.get("/api/users")
async def get_users():
    records = get_records_for_period(30)
    all_users = list(set(r["user_id"] for r in records))

    result = []
    for user_id in sorted(all_users):
        summary = compute_user_summary(user_id, records)
        if summary:
            # Remove internal fields
            public_summary = {k: v for k, v in summary.items() if not k.startswith("_")}
            result.append(public_summary)

    # Sort by cost descending
    result.sort(key=lambda x: x["cost_usd"], reverse=True)
    return result


@app.get("/api/users/{user_id:path}")
async def get_user_detail(user_id: str):
    records = get_records_for_period(30)
    user_records = [r for r in records if r["user_id"] == user_id]

    if not user_records:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")

    summary = compute_user_summary(user_id, records)
    public_summary = {k: v for k, v in summary.items() if not k.startswith("_")}

    # Daily breakdown
    daily_data: Dict[str, Dict[str, float]] = defaultdict(lambda: {"tokens": 0, "cost": 0.0})
    for r in user_records:
        d = r["date"]
        tokens = r["input_tokens"] + r["output_tokens"] + r["cache_read_tokens"] + r["cache_write_tokens"]
        daily_data[d]["tokens"] += tokens
        daily_data[d]["cost"] += r["cost_usd"]

    daily = [
        {"date": d, "tokens": daily_data[d]["tokens"], "cost": round(daily_data[d]["cost"], 4)}
        for d in sorted(daily_data.keys())
    ]

    # Model mix
    model_data: Dict[str, Dict[str, float]] = defaultdict(lambda: {"tokens": 0, "cost": 0.0})
    for r in user_records:
        tokens = r["input_tokens"] + r["output_tokens"] + r["cache_read_tokens"] + r["cache_write_tokens"]
        model_data[r["model"]]["tokens"] += tokens
        model_data[r["model"]]["cost"] += r["cost_usd"]

    total_user_tokens = sum(v["tokens"] for v in model_data.values())
    model_mix = [
        {
            "model": m,
            "tokens": int(model_data[m]["tokens"]),
            "cost": round(model_data[m]["cost"], 4),
            "pct": round(model_data[m]["tokens"] / total_user_tokens * 100, 2) if total_user_tokens > 0 else 0.0,
        }
        for m in sorted(model_data.keys())
    ]

    return {
        "user_id": user_id,
        "summary": public_summary,
        "daily": daily,
        "model_mix": model_mix,
    }


@app.get("/api/model-mix")
async def get_model_mix():
    records = get_records_for_period(30)

    model_data: Dict[str, Dict[str, float]] = defaultdict(lambda: {"tokens": 0, "cost": 0.0})
    for r in records:
        tokens = r["input_tokens"] + r["output_tokens"] + r["cache_read_tokens"] + r["cache_write_tokens"]
        model_data[r["model"]]["tokens"] += tokens
        model_data[r["model"]]["cost"] += r["cost_usd"]

    total_tokens = sum(v["tokens"] for v in model_data.values())
    total_cost = sum(v["cost"] for v in model_data.values())

    result = [
        {
            "model": m,
            "tokens": int(model_data[m]["tokens"]),
            "cost": round(model_data[m]["cost"], 2),
            "pct_tokens": round(model_data[m]["tokens"] / total_tokens * 100, 2) if total_tokens > 0 else 0.0,
            "pct_cost": round(model_data[m]["cost"] / total_cost * 100, 2) if total_cost > 0 else 0.0,
        }
        for m in sorted(model_data.keys())
    ]

    return result


@app.get("/api/recommendations")
async def get_recommendations():
    records = get_records_for_period(30)
    all_users = sorted(set(r["user_id"] for r in records))
    recommendations = []

    for user_id in all_users:
        user_records = [r for r in records if r["user_id"] == user_id]
        if not user_records:
            continue

        summary = compute_user_summary(user_id, records)
        cache_hit_rate = summary["cache_hit_rate"]
        avg_input = summary["_avg_input_tokens"]
        avg_output = summary["_avg_output_tokens"]
        request_count = summary["request_count"]
        total_input = summary["input_tokens"]
        total_cache_read = summary["cache_hit_rate"] * (summary["input_tokens"] + 0)  # approximate

        # Recommendation: enable_caching
        # cache_hit_rate < 0.15 AND avg input > 1500
        if cache_hit_rate < 0.15 and avg_input > 1500:
            # Estimate potential cache reads if they cached well (assume 50% cache rate)
            potential_cache_read_tokens = total_input * 0.50
            actual_cache_read_tokens = summary["cache_hit_rate"] * total_input
            incremental_cache_read = potential_cache_read_tokens - actual_cache_read_tokens

            # Figure out which model they use most
            model_input: Dict[str, int] = defaultdict(int)
            for r in user_records:
                model_input[r["model"]] += r["input_tokens"]
            primary_model = max(model_input, key=lambda m: model_input[m])

            cache_read_price = PRICING[primary_model]["cache_read"]
            input_price = PRICING[primary_model]["input"]
            # Saving = incremental cache reads at cache_read price instead of input price
            saving = incremental_cache_read * (input_price - cache_read_price) / 1_000_000

            severity = "high" if cache_hit_rate < 0.05 else "medium"
            recommendations.append({
                "user_id": user_id,
                "type": "enable_caching",
                "severity": severity,
                "title": f"Enable prompt caching for {user_id.split('@')[0]}",
                "description": (
                    f"{user_id.split('@')[0].capitalize()} has a cache hit rate of only "
                    f"{cache_hit_rate*100:.1f}% with an average input of {avg_input:,.0f} tokens. "
                    f"Enabling prompt caching could reduce costs significantly by reusing repeated context."
                ),
                "estimated_monthly_saving_usd": round(saving, 2),
            })

        # Recommendation: right_size_model
        # Uses sonnet/opus AND avg output < 400
        primary_model = summary["primary_model"]
        if primary_model in ("claude-sonnet-4-6", "claude-opus-4-8") and avg_output < 400:
            # Calculate cost difference if they used haiku
            model_cost_data: Dict[str, Dict[str, int]] = defaultdict(lambda: {"input": 0, "output": 0, "requests": 0})
            for r in user_records:
                if r["model"] in ("claude-sonnet-4-6", "claude-opus-4-8"):
                    model_cost_data[r["model"]]["input"] += r["input_tokens"]
                    model_cost_data[r["model"]]["output"] += r["output_tokens"]

            saving = 0.0
            for model, data in model_cost_data.items():
                current_cost = (
                    data["input"] * PRICING[model]["input"] / 1_000_000
                    + data["output"] * PRICING[model]["output"] / 1_000_000
                )
                haiku_cost = (
                    data["input"] * PRICING["claude-haiku-4-5"]["input"] / 1_000_000
                    + data["output"] * PRICING["claude-haiku-4-5"]["output"] / 1_000_000
                )
                saving += current_cost - haiku_cost

            severity = "high" if primary_model == "claude-opus-4-8" else "medium"
            recommendations.append({
                "user_id": user_id,
                "type": "right_size_model",
                "severity": severity,
                "title": f"Right-size model for {user_id.split('@')[0]}",
                "description": (
                    f"{user_id.split('@')[0].capitalize()} primarily uses {primary_model} but has "
                    f"an average output of only {avg_output:.0f} tokens. For short responses, "
                    f"claude-haiku-4-5 would deliver similar quality at a fraction of the cost."
                ),
                "estimated_monthly_saving_usd": round(saving, 2),
            })

        # Recommendation: shorten_prompts
        # avg input > 6000 AND cache_hit_rate < 0.3
        if avg_input > 6000 and cache_hit_rate < 0.3:
            # Saving = 30% of input cost
            model_input_cost: Dict[str, int] = defaultdict(int)
            for r in user_records:
                model_input_cost[r["model"]] += r["input_tokens"]

            saving = 0.0
            for model, inp in model_input_cost.items():
                saving += inp * PRICING[model]["input"] / 1_000_000 * 0.30

            recommendations.append({
                "user_id": user_id,
                "type": "shorten_prompts",
                "severity": "medium",
                "title": f"Shorten prompts for {user_id.split('@')[0]}",
                "description": (
                    f"{user_id.split('@')[0].capitalize()} averages {avg_input:,.0f} tokens per input request "
                    f"with a low cache hit rate of {cache_hit_rate*100:.1f}%. "
                    f"Trimming prompts by 30% and using structured context could reduce costs substantially."
                ),
                "estimated_monthly_saving_usd": round(saving, 2),
            })

    # Sort by estimated saving descending
    recommendations.sort(key=lambda x: x["estimated_monthly_saving_usd"], reverse=True)
    return recommendations


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, reload=True)
