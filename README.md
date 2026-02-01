# Yoga price benchmark

This project sets up a repeatable pricing benchmark for small local studios (starting with Movement's Yoga in Amsterdam) and produces CSVs ready for Jupyter analysis.

## Scope
- Core studio: Movement's Yoga (https://movementsyoga.com/)
- Competitor tiers
  - Tier 1: very local (<= 15 min walk)
  - Tier 2: local (<= 15 min bike)
  - Tier 3: regional / national players (e.g., Saints and Stars, Sportcity)

## What we capture
- Proposition: class types, heat level, duration, amenities, vibe/positioning
- Pricing: drop-in, class packs, memberships, intro offers, promos
- Commercial terms: contract length, auto-renew, restrictions

## Files
- `data/competitors_template.csv` competitor metadata and tiers
- `data/offers_template.csv` offer-level pricing data
- `docs/benchmark_framework.md` full methodology and variable definitions
- `analysis/benchmark_analysis.py` starter analysis pipeline
- `analysis/web_research.py` web search helper to collect competitors and pricing hints

## Workflow
1) Build a competitor list in `data/competitors_template.csv`
2) Capture offers in `data/offers_template.csv` (one row per offer)
3) Run analysis to compute normalized price metrics and benchmarks

## Web research helper
The web research script queries DuckDuckGo and extracts basic hints (prices, class types, phone/postcode) from candidate websites.

```powershell
python analysis\web_research.py --max-results 25
```

Outputs `data\web_candidates.csv` for review and manual mapping into the template CSVs.
You can pass custom queries with `--queries-file data\queries_example.txt` or `--query "yoga studio Amsterdam Noord"`.

## JS-rendered pricing pages (Playwright)
Some studios render pricing tables with JavaScript. Use Playwright to crawl those pages:

```powershell
pip install -r requirements.txt
python -m playwright install chromium
python analysis\pricing_crawl.py --limit 10 --update-competitors --use-playwright
```

### Data quality improvements included
- Normalized offer names (packs, memberships, drop-ins) for cleaner comparisons.
- Added `price_unit` and surfaced period (week/month/6 months/year) in pricing displays.
- Filters out non-pricing items (e.g., towels, workshops) from the crawl output.

## Weekly refresh + history
Use the weekly refresh script to append snapshots for trend analysis:
- `data\web_candidates_history.csv` (web discovery snapshots)
- `data\offers_history.csv` (pricing snapshots from `data/offers_template.csv`)

```powershell
python analysis\weekly_refresh.py
```

On the Pi, enable the timer units:
```bash
sudo cp /home/bram/yoga-price-benchmark/deploy/pi/yoga-benchmark-refresh.service /etc/systemd/system/yoga-benchmark-refresh.service
sudo cp /home/bram/yoga-price-benchmark/deploy/pi/yoga-benchmark-refresh.timer /etc/systemd/system/yoga-benchmark-refresh.timer
sudo systemctl daemon-reload
sudo systemctl enable --now yoga-benchmark-refresh.timer
```

## Quick start (once data is filled)
```powershell
python analysis\benchmark_analysis.py
```

The script writes a basic `analysis\benchmark_metrics.csv` for further analysis in Jupyter.

## Local web app (deployable)
This includes a lightweight FastAPI server that can be hosted on any VM or PaaS later.

```powershell
pip install -r requirements.txt
python -m uvicorn server.app:app --reload --port 8000
```

Then open `http://localhost:8000`.

## Raspberry Pi (always on)
Use the systemd service and Tailscale instructions here:
- `c:\Users\Bram Verlaan\Documents\Projects\Python\Yoga price benchmark\deploy\pi\setup_pi.md`
- `c:\Users\Bram Verlaan\Documents\Projects\Python\Yoga price benchmark\deploy\pi\yoga-benchmark.service`

### Pi access + URL (current)
- SSH over Tailscale: `ssh bram@100.113.160.98`
- Web app: `http://100.113.160.98:8000/`
- Service name: `yoga-benchmark`

## GitHub
- Repo: https://github.com/bvrln/YogaBenchmark.git
- Branch: main
