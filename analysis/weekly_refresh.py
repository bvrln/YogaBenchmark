from __future__ import annotations

import csv
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
WEB_RESEARCH = BASE_DIR / "analysis" / "web_research.py"

LATEST_CANDIDATES = DATA_DIR / "web_candidates_latest.csv"
HISTORY_CANDIDATES = DATA_DIR / "web_candidates_history.csv"

OFFERS_TEMPLATE = DATA_DIR / "offers_template.csv"
OFFERS_HISTORY = DATA_DIR / "offers_history.csv"
PINNED_PATH = DATA_DIR / "pinned_competitors.json"


def _utc_date() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _append_with_snapshot(input_path: Path, history_path: Path, snapshot_date: str) -> None:
    if not input_path.exists():
        print(f"Missing input file: {input_path}")
        return

    with input_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        if not rows:
            print(f"No rows to append from {input_path}")
            return

    fieldnames = list(rows[0].keys())
    if "snapshot_date" not in fieldnames:
        fieldnames.append("snapshot_date")

    write_header = not history_path.exists()
    with history_path.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()
        for row in rows:
            row["snapshot_date"] = snapshot_date
            writer.writerow(row)


def main() -> None:
    snapshot_date = _utc_date()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("Running web research refresh...")
    command = [
        "python",
        str(WEB_RESEARCH),
        "--max-results",
        "25",
        "--output",
        str(LATEST_CANDIDATES),
    ]

    pinned_queries: list[str] = []
    if PINNED_PATH.exists():
        try:
            data = json.loads(PINNED_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            data = {}
        competitor_ids = data.get("competitor_ids", [])
        if isinstance(competitor_ids, list):
            competitor_map = {row.get("competitor_id"): row for row in _load_csv(COMPETITORS_PATH)}
            for comp_id in competitor_ids:
                row = competitor_map.get(comp_id)
                if row and row.get("name"):
                    pinned_queries.append(f"{row['name']} Amsterdam yoga pricing")

    for query in pinned_queries:
        command.extend(["--query", query])

    subprocess.run(command, check=True)

    _append_with_snapshot(LATEST_CANDIDATES, HISTORY_CANDIDATES, snapshot_date)

    if OFFERS_TEMPLATE.exists():
        _append_with_snapshot(OFFERS_TEMPLATE, OFFERS_HISTORY, snapshot_date)

    print("Refresh complete.")


if __name__ == "__main__":
    main()
