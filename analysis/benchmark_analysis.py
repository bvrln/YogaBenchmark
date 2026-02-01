from __future__ import annotations

from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"

COMPETITORS_PATH = DATA_DIR / "competitors_template.csv"
OFFERS_PATH = DATA_DIR / "offers_template.csv"

OUTPUT_METRICS = Path(__file__).resolve().parent / "benchmark_metrics.csv"
OUTPUT_SUMMARY = Path(__file__).resolve().parent / "benchmark_summary.csv"


def _price_per_class(row: pd.Series, assumed_classes: int) -> float | None:
    price = row.get("price_eur")
    offer_type = str(row.get("offer_type") or "").strip().lower()
    sessions = row.get("sessions_included")

    if pd.isna(price):
        return None

    if offer_type in {"drop_in", "drop-in", "single"}:
        return float(price)

    if offer_type in {"pack", "bundle"}:
        if pd.notna(sessions) and sessions and float(sessions) > 0:
            return float(price) / float(sessions)
        return None

    if offer_type in {"membership", "subscription"}:
        if pd.notna(sessions) and sessions and float(sessions) > 0:
            return float(price) / float(sessions)
        return float(price) / float(assumed_classes)

    return None


def _monthly_equivalent(row: pd.Series) -> float | None:
    price = row.get("price_eur")
    duration_days = row.get("duration_days")

    if pd.isna(price) or pd.isna(duration_days) or not duration_days:
        return None

    return float(price) / float(duration_days) * 30.0


def main() -> None:
    offers = pd.read_csv(OFFERS_PATH)
    competitors = pd.read_csv(COMPETITORS_PATH)

    if offers.empty:
        print("No offers found in data/offers_template.csv. Fill the template and rerun.")
        return

    offers = offers.copy()
    offers["price_per_class_assumed_8"] = offers.apply(
        lambda row: _price_per_class(row, assumed_classes=8), axis=1
    )
    offers["price_per_class_assumed_12"] = offers.apply(
        lambda row: _price_per_class(row, assumed_classes=12), axis=1
    )
    offers["monthly_equivalent"] = offers.apply(_monthly_equivalent, axis=1)

    merged = offers.merge(competitors, on="competitor_id", how="left", suffixes=("", "_competitor"))
    merged.to_csv(OUTPUT_METRICS, index=False)

    summary = (
        merged.groupby(["tier", "offer_type"], dropna=False)["price_per_class_assumed_8"]
        .agg(["count", "min", "median", "max"])
        .reset_index()
    )
    summary.to_csv(OUTPUT_SUMMARY, index=False)

    print(f"Wrote offer-level metrics: {OUTPUT_METRICS}")
    print(f"Wrote tier summary: {OUTPUT_SUMMARY}")


if __name__ == "__main__":
    main()
