from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

import json

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
WEB_DIR = BASE_DIR / "web"

COMPETITORS_PATH = DATA_DIR / "competitors_template.csv"
OFFERS_PATH = DATA_DIR / "offers_template.csv"
SAMPLE_OFFERS_PATH = WEB_DIR / "sample_offers.csv"
SAMPLE_COMPETITORS_PATH = WEB_DIR / "sample_competitors.csv"
SAMPLE_OFFERS_DETAILED_PATH = WEB_DIR / "sample_offers_detailed.csv"
PINNED_PATH = DATA_DIR / "pinned_competitors.json"
OWN_STUDIO_PATH = DATA_DIR / "own_studio.json"

app = FastAPI(title="Yoga Benchmark")


def _load_csv(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return [row for row in reader]


def _price_per_class(offer: dict[str, str], assumed_classes: int = 8) -> str:
    offer_type = (offer.get("offer_type") or "").strip().lower()
    price = offer.get("price_eur")
    sessions = offer.get("sessions_included")
    if not price:
        return ""
    try:
        price_value = float(price)
    except ValueError:
        return ""
    if offer_type in {"drop_in", "drop-in", "single"}:
        return f"{price_value:.2f}"
    if offer_type in {"pack", "bundle"} and sessions:
        try:
            sess = float(sessions)
            if sess > 0:
                return f"{price_value / sess:.2f}"
        except ValueError:
            return ""
    if offer_type in {"membership", "subscription"}:
        try:
            sess = float(sessions) if sessions else float(assumed_classes)
            if sess > 0:
                return f"{price_value / sess:.2f}"
        except ValueError:
            return ""
    return ""


def _build_offer_rows() -> list[dict[str, str]]:
    competitors = {row.get("competitor_id"): row for row in _load_csv(COMPETITORS_PATH)}
    offers = _load_csv(OFFERS_PATH)

    if not offers:
        offers = _load_csv(SAMPLE_OFFERS_DETAILED_PATH)
        if offers:
            return offers
        return _load_csv(SAMPLE_OFFERS_PATH)

    rows: list[dict[str, str]] = []
    for offer in offers:
        competitor = competitors.get(offer.get("competitor_id"), {})
        studio = competitor.get("name") or competitor.get("brand") or "Unknown"
        tier = competitor.get("tier") or "Unassigned"
        offer_name = offer.get("offer_name") or offer.get("offer_type") or "Offer"
        price = offer.get("price_eur") or ""
        price_unit = offer.get("price_unit") or ""
        unit_label = ""
        if price_unit == "week":
            unit_label = " / week"
        elif price_unit == "month":
            unit_label = " / month"
        elif price_unit == "4_weeks":
            unit_label = " / 4 weeks"
        elif price_unit == "6_months":
            unit_label = " / 6 months"
        elif price_unit == "year":
            unit_label = " / year"
        elif price_unit == "class":
            unit_label = " / class"
        rows.append(
            {
                "competitor_id": offer.get("competitor_id") or "",
                "studio": studio,
                "tier": tier,
                "offer": offer_name,
                "offer_type": offer.get("offer_type") or "",
                "class_type": offer.get("class_type") or "",
                "heat": offer.get("heat") or "",
                "class_length_min": offer.get("class_length_min") or "",
                "sessions_included": offer.get("sessions_included") or "",
                "duration_days": offer.get("duration_days") or "",
                "price_eur": price,
                "price_unit": price_unit,
                "price": f"EUR {price}{unit_label}" if price else "",
                "price_per_class": _price_per_class(offer),
            }
        )
    return rows


def _build_competitor_rows() -> list[dict[str, str]]:
    competitors = _load_csv(COMPETITORS_PATH)
    if not competitors:
        return _load_csv(SAMPLE_COMPETITORS_PATH)
    return competitors


@app.get("/api/offers")
def get_offers() -> list[dict[str, str]]:
    return _build_offer_rows()


@app.get("/api/competitors")
def get_competitors() -> list[dict[str, str]]:
    return _build_competitor_rows()


@app.get("/api/pins")
def get_pins() -> dict[str, list[str]]:
    if not PINNED_PATH.exists():
        return {"competitor_ids": []}
    try:
        data = json.loads(PINNED_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"competitor_ids": []}
    competitor_ids = data.get("competitor_ids")
    if not isinstance(competitor_ids, list):
        return {"competitor_ids": []}
    return {"competitor_ids": competitor_ids[:10]}


@app.post("/api/pins")
def set_pins(payload: dict[str, list[str]]) -> dict[str, list[str]]:
    competitor_ids = payload.get("competitor_ids", [])
    if not isinstance(competitor_ids, list):
        competitor_ids = []
    cleaned = [str(item) for item in competitor_ids][:10]
    PINNED_PATH.parent.mkdir(parents=True, exist_ok=True)
    PINNED_PATH.write_text(json.dumps({"competitor_ids": cleaned}, indent=2), encoding="utf-8")
    return {"competitor_ids": cleaned}


@app.get("/api/own_studio")
def get_own_studio() -> dict[str, Any]:
    if not OWN_STUDIO_PATH.exists():
        return {}
    try:
        return json.loads(OWN_STUDIO_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
