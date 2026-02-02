from __future__ import annotations

import csv
from pathlib import Path
from typing import Any
import subprocess
import sys
import threading
from datetime import datetime, timezone

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
CLIENT_CONFIG_PATH = DATA_DIR / "client_config.json"
REFRESH_STATUS_PATH = DATA_DIR / "pricing_refresh_status.json"
PRICING_CRAWL_PATH = BASE_DIR / "analysis" / "pricing_crawl.py"

app = FastAPI(title="Yoga Benchmark")
_refresh_lock = threading.Lock()
_refresh_in_progress = False


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


def _write_refresh_status(payload: dict[str, Any]) -> None:
    REFRESH_STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    REFRESH_STATUS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _load_refresh_status() -> dict[str, Any]:
    if not REFRESH_STATUS_PATH.exists():
        return {"status": "idle", "message": "Pricing refresh idle", "in_progress": False}
    try:
        data = json.loads(REFRESH_STATUS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"status": "idle", "message": "Pricing refresh idle", "in_progress": False}
    if not isinstance(data, dict):
        return {"status": "idle", "message": "Pricing refresh idle", "in_progress": False}
    data["in_progress"] = bool(data.get("in_progress"))
    return data


def _run_pricing_refresh(limit: int) -> None:
    global _refresh_in_progress
    start_time = datetime.now(timezone.utc).isoformat()
    _write_refresh_status(
        {
            "status": "running",
            "message": "Pricing refresh running",
            "started_at": start_time,
            "in_progress": True,
        }
    )
    try:
        result = subprocess.run(
            [
                sys.executable,
                str(PRICING_CRAWL_PATH),
                "--limit",
                str(limit),
                "--update-competitors",
                "--use-playwright",
            ],
            capture_output=True,
            text=True,
            timeout=1800,
        )
        status = "success" if result.returncode == 0 else "failed"
        message = "Pricing refresh complete" if result.returncode == 0 else "Pricing refresh failed"
        _write_refresh_status(
            {
                "status": status,
                "message": message,
                "started_at": start_time,
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "last_run": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "return_code": result.returncode,
                "stderr": result.stderr[-1000:] if result.stderr else "",
                "in_progress": False,
            }
        )
    except Exception as exc:
        _write_refresh_status(
            {
                "status": "failed",
                "message": f"Pricing refresh failed: {exc}",
                "started_at": start_time,
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "in_progress": False,
            }
        )
    finally:
        _refresh_in_progress = False


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


@app.get("/api/refresh-status")
def get_refresh_status() -> dict[str, Any]:
    return _load_refresh_status()


@app.post("/api/refresh-pricing")
def refresh_pricing(payload: dict[str, Any]) -> dict[str, Any]:
    global _refresh_in_progress
    with _refresh_lock:
        if _refresh_in_progress:
            status = _load_refresh_status()
            status["in_progress"] = True
            return status
        _refresh_in_progress = True
        limit = payload.get("limit", 10)
        try:
            limit = int(limit)
        except (TypeError, ValueError):
            limit = 10
        _write_refresh_status(
            {
                "status": "running",
                "message": "Pricing refresh running",
                "started_at": datetime.now(timezone.utc).isoformat(),
                "in_progress": True,
            }
        )
        thread = threading.Thread(target=_run_pricing_refresh, args=(limit,), daemon=True)
        thread.start()
    return _load_refresh_status()


@app.get("/api/own-studio")
def get_own_studio() -> dict[str, Any]:
    """Get active client studio data from config + CSV."""
    # Load client config
    if not CLIENT_CONFIG_PATH.exists():
        return {}
    try:
        config = json.loads(CLIENT_CONFIG_PATH.read_text(encoding="utf-8"))
        active_client_id = config.get("active_client_id")
        if not active_client_id:
            return {}
    except json.JSONDecodeError:
        return {}
    
    # Load competitor data
    competitors = _load_csv(COMPETITORS_PATH)
    competitor = next((c for c in competitors if c.get("competitor_id") == active_client_id), None)
    if not competitor:
        return {}
    
    # Load offers for this client
    all_offers = _load_csv(OFFERS_PATH)
    client_offers = [o for o in all_offers if o.get("competitor_id") == active_client_id]
    
    # Build response matching old format
    return {
        "competitor_id": active_client_id,
        "name": competitor.get("name", ""),
        "brand": competitor.get("brand", ""),
        "website": competitor.get("website", ""),
        "address": competitor.get("address", ""),
        "city": competitor.get("city", ""),
        "segment": competitor.get("segment", ""),
        "proposition": competitor.get("proposition_notes", ""),
        "offers": client_offers
    }


app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
