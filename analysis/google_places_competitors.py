from __future__ import annotations

import csv
import json
import math
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"

KEY_PATH = Path(r"C:\Users\Bram Verlaan\Documents\Projects\Python\GooglePlaces_key.txt")
OUT_PATH = DATA_DIR / "competitors_template.csv"

USER_AGENT = "YogaBenchmarkBot/1.0 (contact: local)"

KEYWORDS = [
    "yoga studio",
    "hot yoga",
    "yoga",
]

LOCATIONS = [
    ("Amsterdam Vondelpark", "Overtoom 230-232, 1054 HZ Amsterdam"),
    ("Amsterdam City", "Utrechtsedwarsstraat 31h, 1017 WB Amsterdam"),
    ("Amsterdam LABzuid", "Olympiaplein 74-A, 1076 AG Amsterdam"),
    ("Haarlem", "Kruisweg 72, 2011 LG Haarlem"),
]


def _read_key(path: Path) -> str:
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        raise RuntimeError(f"Empty API key file: {path}")
    return raw


def _fetch_json(url: str) -> dict[str, Any]:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _place_text_search(api_key: str, query: str) -> dict[str, Any]:
    params = {"query": query, "key": api_key}
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json?" + urlencode(params)
    return _fetch_json(url)


def _text_search_paged(api_key: str, query: str) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json?" + urlencode(
        {"query": query, "key": api_key}
    )
    while True:
        data = _fetch_json(url)
        results.extend(data.get("results", []))
        token = data.get("next_page_token")
        if not token:
            break
        time.sleep(2.0)
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json?" + urlencode(
            {"pagetoken": token, "key": api_key}
        )
    return results




def main() -> None:
    api_key = _read_key(KEY_PATH)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    anchors: list[dict[str, Any]] = []
    for name, address in LOCATIONS:
        anchor_query = f"Movements Yoga {address}"
        anchor = _place_text_search(api_key, anchor_query)
        if not anchor.get("results"):
            raise RuntimeError(f"Could not geocode {name} via Google Places.")
        anchor_loc = anchor["results"][0]["geometry"]["location"]
        anchors.append(
            {
                "name": name,
                "latitude": float(anchor_loc["lat"]),
                "longitude": float(anchor_loc["lng"]),
            }
        )

    seen_ids: set[str] = set()
    places: list[dict[str, Any]] = []
    for anchor in anchors:
        for keyword in KEYWORDS:
            query = f"{keyword} near {anchor['name']} {anchor['latitude']},{anchor['longitude']}"
            for item in _text_search_paged(api_key, query):
                place_id = item.get("place_id")
                if not place_id or place_id in seen_ids:
                    continue
                seen_ids.add(place_id)
                places.append(item)

    rows: list[dict[str, str]] = []
    for item in places:
        name = item.get("name") or ""
        geometry = item.get("geometry", {}).get("location", {})
        lat = geometry.get("lat")
        lon = geometry.get("lng")
        if lat is None or lon is None:
            continue

        min_dist = None
        nearest_name = ""
        for anchor in anchors:
            dist_m = _haversine(anchor["latitude"], anchor["longitude"], float(lat), float(lon))
            if min_dist is None or dist_m < min_dist:
                min_dist = dist_m
                nearest_name = anchor["name"]
        if min_dist is None:
            continue
        dist_m = min_dist
        walk_min = round(dist_m / 80)  # ~4.8 km/h
        bike_min = round(dist_m / 250)  # ~15 km/h
        if dist_m <= 1200:
            tier = "Tier 1"
        elif dist_m <= 4500:
            tier = "Tier 2"
        else:
            tier = "Tier 3"

        address = item.get("formatted_address") or item.get("vicinity") or ""
        rows.append(
            {
                "competitor_id": f"comp-{len(rows)+1:03d}",
                "name": name,
                "brand": "",
                "website": "",
                "address": address,
                "postcode": "",
                "city": "Amsterdam",
                "latitude": f"{float(lat):.6f}",
                "longitude": f"{float(lon):.6f}",
                "distance_walk_min": str(walk_min),
                "distance_bike_min": str(bike_min),
                "tier": tier,
                "segment": "yoga studio",
                "proposition_notes": f"nearest_location={nearest_name}",
                "last_checked_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            }
        )

    rows = [
        row
        for row in rows
        if "movements" not in row["name"].lower()
        and "movementsyoga.com" not in row["website"].lower()
    ]
    rows.sort(key=lambda r: int(r["distance_bike_min"]))

    with OUT_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "competitor_id",
                "name",
                "brand",
                "website",
                "address",
                "postcode",
                "city",
                "latitude",
                "longitude",
                "distance_walk_min",
                "distance_bike_min",
                "tier",
                "segment",
                "proposition_notes",
                "last_checked_date",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    for anchor in anchors:
        print(f"Anchor: {anchor['name']} {anchor['latitude']:.6f},{anchor['longitude']:.6f}")
    print(f"Wrote {len(rows)} competitors to {OUT_PATH}")


if __name__ == "__main__":
    main()
