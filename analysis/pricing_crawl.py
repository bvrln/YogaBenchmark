from __future__ import annotations

import argparse
import csv
import json
import re
import html
import time
from datetime import datetime, timezone
from pathlib import Path
import os
from typing import Any
from urllib.parse import urlparse, urlencode, urljoin
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"

DEFAULT_KEY_PATHS = [
    Path(r"C:\Users\Bram Verlaan\Documents\Projects\Python\GooglePlaces_key.txt"),
    Path(__file__).resolve().parents[1] / "data" / "GooglePlaces_key.txt",
    Path(__file__).resolve().parents[1] / "data" / "google_places_key.txt",
]
COMPETITORS_PATH = DATA_DIR / "competitors_template.csv"
PINS_PATH = DATA_DIR / "pinned_competitors.json"

PLACES_CACHE_PATH = DATA_DIR / "places_cache.json"
PRICING_PAGES_PATH = DATA_DIR / "pricing_pages.csv"
OFFERS_AUTO_PATH = DATA_DIR / "offers_auto.csv"
OFFERS_TEMPLATE_PATH = DATA_DIR / "offers_template.csv"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
EURO_SIGN = "\N{EURO SIGN}"

PRICING_KEYWORDS = [
    "price",
    "pricing",
    "prijzen",
    "tarief",
    "tarieven",
    "membership",
    "memberships",
    "abonnement",
    "pass",
    "passen",
    "strippenkaart",
    "classes",
    "class",
    "schedule",
    "timetable",
    "rooster",
]

EXTERNAL_LINK_HINTS = [
    "mindbody",
    "momoyoga",
    "eversports",
    "bsport",
    "bookwhen",
    "shop",
    "store",
]

CLASS_TYPE_MAP = [
    ("private", "private"),
    ("hot pilates", "hot_pilates"),
    ("hot yoga", "hot_yoga"),
    ("vinyasa", "vinyasa"),
    ("ashtanga", "ashtanga"),
    ("yin", "yin"),
    ("kundalini", "kundalini"),
    ("pilates", "pilates"),
    ("barre", "barre"),
    ("power yoga", "power_yoga"),
    ("hatha", "hatha"),
    ("yoga", "yoga"),
]

OFFER_TYPE_HINTS = [
    ("drop-in", "drop_in"),
    ("drop in", "drop_in"),
    ("single", "drop_in"),
    ("intro", "intro"),
    ("trial", "intro"),
    ("proef", "intro"),
]

PACK_HINTS = [
    "class card",
    "classcard",
    "strippenkaart",
    "rittenkaart",
    "lessenkaart",
    "lessen kaart",
    "pack",
    "pass",
    "kaart",
    "credits",
    "credit",
    "unit",
    "units",
]

MEMBERSHIP_HINTS = [
    "membership",
    "abonnement",
    "unlimited",
    "onbeperkt",
    "monthly",
    "per month",
    "maand",
    "weekly",
    "per week",
    "week",
    "yearly",
    "per year",
    "jaar",
]

IGNORE_TERMS = [
    "towel",
    "mat",
    "merch",
    "shop",
    "gift card",
    "cadeau",
    "water bottle",
    "workshop",
    "retreat",
    "training",
    "event",
    "reserve your spot",
    "ticket",
    "register",
]


def _read_key_from_path(path: Path) -> str:
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        raise RuntimeError(f"Empty API key file: {path}")
    return raw


def _read_key() -> str:
    env_key = os.getenv("GOOGLE_PLACES_KEY")
    if env_key:
        return env_key.strip()
    env_path = os.getenv("GOOGLE_PLACES_KEY_PATH")
    if env_path:
        path = Path(env_path)
        if path.exists():
            return _read_key_from_path(path)
    for path in DEFAULT_KEY_PATHS:
        if path.exists():
            return _read_key_from_path(path)
    raise RuntimeError(
        "Google Places API key not found. Set GOOGLE_PLACES_KEY or GOOGLE_PLACES_KEY_PATH."
    )


def _fetch_json(url: str) -> dict[str, Any]:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=25) as response:
        return json.loads(response.read().decode("utf-8"))


def _fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=25) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


class PlaywrightSession:
    def __init__(self, user_agent: str) -> None:
        self._user_agent = user_agent
        self._playwright = None
        self._browser = None
        self._context = None
        self._page = None

    def __enter__(self) -> "PlaywrightSession":
        try:
            from playwright.sync_api import sync_playwright  # type: ignore
        except Exception as exc:  # pragma: no cover - import guard
            raise RuntimeError(
                "Playwright is not installed. Run: pip install playwright"
            ) from exc
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(headless=True)
        self._context = self._browser.new_context(user_agent=self._user_agent)
        self._page = self._context.new_page()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if self._context:
            self._context.close()
        if self._browser:
            self._browser.close()
        if self._playwright:
            self._playwright.stop()

    def fetch_text(self, url: str) -> str:
        if not self._page:
            raise RuntimeError("Playwright page not initialized.")
        try:
            self._page.goto(url, wait_until="networkidle", timeout=30000)
        except Exception:
            self._page.goto(url, wait_until="domcontentloaded", timeout=30000)
        self._page.wait_for_timeout(1200)
        return self._page.content()


def _load_competitors() -> list[dict[str, str]]:
    if not COMPETITORS_PATH.exists():
        return []
    with COMPETITORS_PATH.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def _load_pins() -> set[str]:
    if not PINS_PATH.exists():
        return set()
    try:
        data = json.loads(PINS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return set()
    if not isinstance(data, dict):
        return set()
    ids = data.get("competitor_ids", [])
    if not isinstance(ids, list):
        return set()
    return set(str(item) for item in ids)


def _load_places_cache() -> dict[str, Any]:
    if not PLACES_CACHE_PATH.exists():
        return {}
    try:
        return json.loads(PLACES_CACHE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_places_cache(cache: dict[str, Any]) -> None:
    PLACES_CACHE_PATH.write_text(json.dumps(cache, indent=2), encoding="utf-8")


def _places_text_search(api_key: str, query: str) -> dict[str, Any]:
    params = {"query": query, "key": api_key}
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json?" + urlencode(params)
    return _fetch_json(url)


def _places_details(api_key: str, place_id: str) -> dict[str, Any]:
    fields = "name,formatted_address,website,url,formatted_phone_number"
    params = {"place_id": place_id, "fields": fields, "key": api_key}
    url = "https://maps.googleapis.com/maps/api/place/details/json?" + urlencode(params)
    return _fetch_json(url).get("result", {})


def _normalize_domain(url: str) -> str:
    parsed = urlparse(url)
    return parsed.netloc.lower()


def _collect_links(html: str, base_url: str) -> list[str]:
    links = re.findall(r'href="([^"#]+)"', html, flags=re.I)
    normalized = []
    base_domain = _normalize_domain(base_url)
    for link in links:
        absolute = urljoin(base_url, link)
        domain = _normalize_domain(absolute)
        lower_url = absolute.lower()
        is_external = domain != base_domain
        has_pricing_hint = any(keyword in lower_url for keyword in PRICING_KEYWORDS)
        has_external_hint = any(hint in lower_url for hint in EXTERNAL_LINK_HINTS)
        if is_external and not (has_pricing_hint or has_external_hint):
            continue
        if has_pricing_hint or has_external_hint:
            normalized.append(absolute.split("?")[0])
    # de-dup
    deduped = []
    for link in normalized:
        if link not in deduped:
            deduped.append(link)
    return deduped[:6]


def _extract_prices(text: str) -> list[tuple[str, str]]:
    hits: list[tuple[str, str]] = []
    # capture euro patterns (prefix or suffix)
    currency = rf"(?:EUR|{re.escape(EURO_SIGN)}|&euro;|&#8364;|&#x20ac;)"
    number = r"\d+[.,]?\d*(?:,-)?"
    prefix = rf"{currency}\s?{number}"
    suffix = rf"{number}\s?{currency}"
    pattern = rf"(?:{prefix}|{suffix})"
    for match in re.finditer(pattern, text, flags=re.IGNORECASE):
        raw = match.group(0)
        context_start = max(0, match.start() - 60)
        context_end = min(len(text), match.end() + 60)
        context = text[context_start:context_end]
        context = re.sub(r"\s+", " ", context).strip()
        lower = context.lower()
        if "{" in context or "}" in context:
            continue
        if any(term in lower for term in ["facebook", "instagram", "cookie", "privacy", "terms", "newsletter"]):
            continue
        if any(term in lower for term in IGNORE_TERMS):
            continue
        hits.append((raw, context))
    return hits


def _parse_price(raw: str) -> str:
    cleaned = (
        raw.replace("EUR", "")
        .replace(EURO_SIGN, "")
        .replace("&euro;", "")
        .replace("&#8364;", "")
        .replace("&#x20ac;", "")
        .strip()
    )
    cleaned = cleaned.replace(",-", "").strip()
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned and "." not in cleaned:
        cleaned = cleaned.replace(",", ".")
    return cleaned


def _clean_offer_name(
    context: str,
    offer_type: str,
    sessions_included: str,
    duration_days: str,
    price_unit: str,
) -> str:
    lower = context.lower()
    if offer_type == "drop_in":
        return "Drop-in class"
    if offer_type == "intro":
        return "Intro offer"
    if offer_type == "membership":
        label = "Unlimited membership" if "unlimited" in lower or "onbeperkt" in lower else "Membership"
        if price_unit == "week":
            return f"{label} (weekly)"
        if price_unit == "month":
            return f"{label} (monthly)"
        if price_unit == "4_weeks":
            return f"{label} (4 weeks)"
        if price_unit == "6_months":
            return f"{label} (6 months)"
        if price_unit == "year":
            return f"{label} (yearly)"
        if duration_days == "365":
            return f"{label} (yearly)"
        return label
    if offer_type == "pack" and sessions_included:
        suffix = f"{sessions_included}-class pack"
        if duration_days:
            return f"{suffix} ({duration_days}d valid)"
        return suffix
    context = re.sub(r"\s+", " ", context)
    context = context.replace(EURO_SIGN, "EUR ")
    if "{" in context or "}" in context:
        context = context.split("{")[0].strip()
    parts = re.split(r"[.!?]", context)
    for part in parts:
        if "EUR" in part or re.search(r"\d+[.,]?\d*", part):
            return part.strip()[:100]
    return context.strip()[:100]


def _infer_offer_type(context: str) -> str:
    lower = context.lower()
    if any(hint in lower for hint in PACK_HINTS):
        return "pack"
    if any(hint in lower for hint in MEMBERSHIP_HINTS):
        return "membership"
    for hint, offer_type in OFFER_TYPE_HINTS:
        if hint in lower:
            return offer_type
    return "unknown"


def _infer_class_type(context: str) -> tuple[str, str]:
    lower = context.lower()
    heat = ""
    for hint, class_type in CLASS_TYPE_MAP:
        if hint in lower:
            if "hot" in hint:
                heat = "hot"
            return class_type, heat
    return "", heat


def _infer_sessions(context: str) -> str:
    patterns = [
        r"\b(\d{1,2})\s*(?:class|classes|lessen|lessons)\b",
        r"\b(\d{1,2})\s*(?:x|times)\b",
        r"\b(\d{1,2})\s*(?:unit|units|credit|credits)\b",
        r"\b(\d{1,2})\s*(?:ritten|rittenkaart)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, context, re.I)
        if match:
            return match.group(1)
    return ""


def _nearest_period(context: str, raw_price: str) -> str:
    lower = context.lower()
    if not raw_price:
        return lower
    idx = lower.find(raw_price.lower())
    if idx == -1:
        return lower
    start = max(0, idx - 40)
    end = min(len(lower), idx + 40)
    return lower[start:end]


def _infer_price_unit(context: str, raw_price: str) -> str:
    window = _nearest_period(context, raw_price)
    if any(term in window for term in ["per week", "weekly", "week"]):
        return "week"
    if any(term in window for term in ["per month", "monthly", "maand"]):
        return "month"
    if any(term in window for term in ["half year", "halfyear", "6 months", "6 maand", "6 maanden"]):
        return "6_months"
    if any(term in window for term in ["per 4 weeks", "4 weeks", "4 weken"]):
        return "4_weeks"
    if any(term in window for term in ["per year", "yearly", "jaar"]):
        return "year"
    if any(term in window for term in ["per class", "per lesson", "single"]):
        return "class"
    return ""


def _infer_duration_days(context: str, raw_price: str, price_unit: str) -> str:
    lower = context.lower()
    if "28 days" in lower:
        return "28"
    if "1 month" in lower or "one month" in lower:
        return "30"
    if "3 months" in lower or "3 maand" in lower:
        return "90"
    if "6 months" in lower or "6 maand" in lower:
        return "180"
    if "1 year" in lower:
        return "365"
    weeks = re.search(r"\b(\d+)\s*week", lower)
    if weeks:
        return str(int(weeks.group(1)) * 7)
    if price_unit == "week":
        return "7"
    if price_unit == "month":
        return "30"
    if price_unit == "4_weeks":
        return "28"
    if price_unit == "6_months":
        return "180"
    if price_unit == "year":
        return "365"
    return ""


def _infer_class_length(context: str) -> str:
    match = re.search(r"\b(\d{2,3})\s*(?:min|minutes)\b", context, re.I)
    if match:
        return match.group(1)
    return ""


def _infer_usage_restrictions(context: str) -> tuple[str, str, str]:
    """
    Extract usage restrictions for memberships.
    Returns: (usage_limit_type, usage_limit_value, usage_limit_period)
    """
    lower = context.lower()
    
    # Check for unlimited first
    if any(term in lower for term in ["unlimited", "onbeperkt", "no limit", "geen limiet"]):
        return ("unlimited", "", "")
    
    # Check for classes per week
    patterns_week = [
        r"(\d+)\s*(?:x|times)?\s*(?:per|/)\s*week",
        r"(\d+)\s*(?:classes?|lessen)\s*(?:per|/)\s*week",
        r"(\d+)x\s*(?:per|/)\s*week",
    ]
    for pattern in patterns_week:
        match = re.search(pattern, lower)
        if match:
            return ("classes_per_week", match.group(1), "week")
    
    # Check for classes per month
    patterns_month = [
        r"(\d+)\s*(?:x|times)?\s*(?:per|/)\s*(?:month|maand)",
        r"(\d+)\s*(?:classes?|lessen)\s*(?:per|/)\s*(?:month|maand)",
        r"(\d+)x\s*(?:per|/)\s*(?:month|maand)",
    ]
    for pattern in patterns_month:
        match = re.search(pattern, lower)
        if match:
            return ("classes_per_month", match.group(1), "month")
    
    # Default: assume unlimited if it's a membership
    if any(term in lower for term in ["membership", "abonnement"]):
        return ("unlimited", "", "")
    
    return ("", "", "")


def _infer_contract_terms(context: str) -> tuple[str, str, str]:
    """
    Extract contract terms.
    Returns: (contract_type, minimum_commitment_months, cancellation_notice_days)
    """
    lower = context.lower()
    
    # Check for month-to-month / no commitment
    if any(term in lower for term in [
        "month-to-month", "month to month", "no commitment", "cancel anytime",
        "geen binding", "opzegbaar", "maand-tot-maand"
    ]):
        # Check for cancellation notice period
        notice_match = re.search(r"(\d+)\s*(?:days?|dagen)\s*(?:notice|opzegtermijn)", lower)
        notice_days = notice_match.group(1) if notice_match else "30"
        return ("month_to_month", "1", notice_days)
    
    # Check for annual commitment
    if any(term in lower for term in [
        "12 month", "12-month", "annual", "yearly", "jaar", "12 maanden"
    ]):
        return ("annual", "12", "0")
    
    # Check for 6-month commitment
    if any(term in lower for term in ["6 month", "6-month", "half year", "6 maanden"]):
        return ("semi_annual", "6", "0")
    
    # Check for 3-month commitment
    if any(term in lower for term in ["3 month", "3-month", "quarterly", "3 maanden"]):
        return ("quarterly", "3", "0")
    
    # Check for intro offers
    if any(term in lower for term in ["intro", "trial", "proef"]):
        return ("intro", "0", "0")
    
    # Default: assume month-to-month for memberships
    if any(term in lower for term in ["membership", "abonnement"]):
        return ("month_to_month", "1", "30")
    
    return ("", "", "")


def _infer_class_style(class_type: str, context: str) -> tuple[str, str]:
    """
    Infer detailed class style and intensity level.
    Returns: (class_style, intensity_level)
    """
    lower = context.lower()
    
    # Yoga styles
    if class_type in ["yoga", "hot_yoga"]:
        if any(term in lower for term in ["vinyasa", "flow"]):
            if any(term in lower for term in ["power", "athletic", "strong"]):
                return ("power_yoga", "high")
            return ("vinyasa_flow", "moderate")
        
        if any(term in lower for term in ["power", "athletic"]):
            return ("power_yoga", "high")
        
        if any(term in lower for term in ["yin", "restorative", "gentle", "slow"]):
            return ("yin_restorative", "low")
        
        if any(term in lower for term in ["bikram", "26+2", "26 postures"]):
            return ("bikram_26_2", "high")
        
        if any(term in lower for term in ["ashtanga"]):
            return ("ashtanga", "moderate")
        
        if any(term in lower for term in ["hatha"]):
            return ("hatha", "moderate")
    
    # Pilates styles
    if class_type == "pilates":
        if any(term in lower for term in ["reformer"]):
            return ("reformer_pilates", "moderate")
        return ("mat_pilates", "moderate")
    
    return ("", "")


def _select_competitors(rows: list[dict[str, str]], limit: int) -> list[dict[str, str]]:
    pins = _load_pins()
    pinned = [row for row in rows if row.get("competitor_id") in pins]
    others = [row for row in rows if row.get("competitor_id") not in pins]
    others.sort(key=lambda r: int(r.get("distance_bike_min") or 9999))
    combined = pinned + others
    return combined[:limit]


def main() -> None:
    parser = argparse.ArgumentParser(description="Crawl competitor sites for pricing hints.")
    parser.add_argument("--limit", type=int, default=40, help="Number of competitors to crawl.")
    parser.add_argument("--update-competitors", action="store_true", help="Update competitors_template.csv with websites.")
    parser.add_argument(
        "--use-playwright",
        action="store_true",
        help="Use Playwright to render JS-heavy pricing pages (slower, higher coverage).",
    )
    args = parser.parse_args()

    api_key = _read_key()
    competitors = _load_competitors()
    if not competitors:
        raise RuntimeError("No competitors found. Populate competitors_template.csv first.")

    selected = _select_competitors(competitors, args.limit)
    places_cache = _load_places_cache()

    pricing_rows: list[dict[str, str]] = []
    offer_rows: list[dict[str, str]] = []
    offer_keys: set[str] = set()

    def run_crawl(fetch_text) -> None:
        for row in selected:
            competitor_id = row.get("competitor_id") or ""
            name = row.get("name") or ""
            address = row.get("address") or ""
            city = row.get("city") or "Amsterdam"
            website = row.get("website") or ""

            cache_key = f"{name}|{address}|{city}"
            if not website:
                if cache_key in places_cache:
                    website = places_cache[cache_key].get("website", "")
                else:
                    query = f"{name} {address} {city}"
                    result = _places_text_search(api_key, query)
                    place = result.get("results", [None])[0]
                    if place and place.get("place_id"):
                        details = _places_details(api_key, place["place_id"])
                        website = details.get("website", "")
                        places_cache[cache_key] = {
                            "place_id": place.get("place_id"),
                            "website": website,
                            "formatted_address": details.get("formatted_address", ""),
                        }
                        time.sleep(0.2)

            if not website:
                continue

            try:
                home_html = fetch_text(website)
            except Exception:
                continue

            pages = [website]
            pages.extend(_collect_links(home_html, website))

            for page_url in pages:
                try:
                    html_text = fetch_text(page_url)
                except Exception:
                    continue
                text = re.sub(r"<[^>]+>", " ", html_text)
                text = html.unescape(text)
                text = re.sub(r"\s+", " ", text)
                for raw_price, context in _extract_prices(text):
                    price_value = _parse_price(raw_price)
                    pricing_rows.append(
                        {
                            "competitor_id": competitor_id,
                            "competitor_name": name,
                            "page_url": page_url,
                            "price_raw": raw_price,
                            "price_eur": price_value,
                            "context": context,
                            "last_checked_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        }
                    )

                    price_unit = _infer_price_unit(context, raw_price)
                    sessions_included = _infer_sessions(context)
                    duration_days = _infer_duration_days(context, raw_price, price_unit)
                    offer_type = _infer_offer_type(context)
                    class_type, heat = _infer_class_type(context)
                    class_length_min = _infer_class_length(context)

                    offer_name = _clean_offer_name(
                        context,
                        offer_type,
                        sessions_included,
                        duration_days,
                        price_unit,
                    )
                    key_parts = [
                        competitor_id,
                        offer_type,
                        class_type,
                        heat,
                        class_length_min,
                        sessions_included,
                        duration_days,
                        price_unit,
                        price_value,
                    ]
                    offer_key = "|".join(key_parts)
                    if offer_key in offer_keys:
                        continue
                    offer_keys.add(offer_key)

                    # Extract enhanced fields
                    usage_limit_type, usage_limit_value, usage_limit_period = _infer_usage_restrictions(context)
                    contract_type, min_commitment_months, cancellation_notice_days = _infer_contract_terms(context)
                    class_style, intensity_level = _infer_class_style(class_type, context)

                    offer_rows.append(
                        {
                            "offer_id": f"auto-{len(offer_rows)+1:04d}",
                            "competitor_id": competitor_id,
                            "offer_type": offer_type,
                            "offer_name": offer_name,
                            "class_type": class_type,
                            "heat": heat,
                            "class_length_min": class_length_min,
                            "sessions_included": sessions_included,
                            "duration_days": duration_days,
                            "price_eur": price_value,
                            "price_unit": price_unit,
                            "currency": "EUR",
                            "auto_renew": "",
                            "contract_months": min_commitment_months,
                            "booking_limit": "",
                            "intro_restrictions": "",
                            "usage_limit_type": usage_limit_type,
                            "usage_limit_value": usage_limit_value,
                            "usage_limit_period": usage_limit_period,
                            "contract_type": contract_type,
                            "cancellation_notice_days": cancellation_notice_days,
                            "class_style": class_style,
                            "intensity_level": intensity_level,
                            "source_url": page_url,
                            "last_checked_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        }
                    )

            if args.update_competitors and website and not row.get("website"):
                row["website"] = website

            time.sleep(0.3)

    if args.use_playwright:
        with PlaywrightSession(USER_AGENT) as session:
            run_crawl(session.fetch_text)
    else:
        run_crawl(_fetch_text)

    _save_places_cache(places_cache)

    with PRICING_PAGES_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "competitor_id",
                "competitor_name",
                "page_url",
                "price_raw",
                "price_eur",
                "context",
                "last_checked_date",
            ],
        )
        writer.writeheader()
        writer.writerows(pricing_rows)

    with OFFERS_AUTO_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "offer_id",
                "competitor_id",
                "offer_type",
                "offer_name",
                "class_type",
                "heat",
                "class_length_min",
                "sessions_included",
                "duration_days",
                "price_eur",
                "price_unit",
                "currency",
                "auto_renew",
                "contract_months",
                "booking_limit",
                "intro_restrictions",
                "usage_limit_type",
                "usage_limit_value",
                "usage_limit_period",
                "contract_type",
                "cancellation_notice_days",
                "class_style",
                "intensity_level",
                "source_url",
                "last_checked_date",
            ],
        )
        writer.writeheader()
        writer.writerows(offer_rows)

    with OFFERS_TEMPLATE_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "offer_id",
                "competitor_id",
                "offer_type",
                "offer_name",
                "class_type",
                "heat",
                "class_length_min",
                "sessions_included",
                "duration_days",
                "price_eur",
                "price_unit",
                "currency",
                "auto_renew",
                "contract_months",
                "booking_limit",
                "intro_restrictions",
                "usage_limit_type",
                "usage_limit_value",
                "usage_limit_period",
                "contract_type",
                "cancellation_notice_days",
                "class_style",
                "intensity_level",
                "source_url",
                "last_checked_date",
            ],
        )
        writer.writeheader()
        writer.writerows(offer_rows)

    if args.update_competitors:
        with COMPETITORS_PATH.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=competitors[0].keys())
            writer.writeheader()
            writer.writerows(competitors)

    print(f"Pricing pages: {PRICING_PAGES_PATH}")
    print(f"Offers auto: {OFFERS_AUTO_PATH}")
    print(f"Offers template: {OFFERS_TEMPLATE_PATH}")


if __name__ == "__main__":
    main()
