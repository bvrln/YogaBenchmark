# Benchmark framework (Yoga studios)

## Goal
Provide a repeatable, analyst-friendly benchmark of yoga studio pricing and propositions for small business owners.

## Tiering and competitive set
- Tier 1 (walk): <= 15 min walk from the focal studio
- Tier 2 (bike): <= 15 min bike
- Tier 3 (regional/national): notable chains or destination studios in the city or country

Recommended approach to build the list:
1) Map search around the focal studio (Google Maps, Apple Maps, or OpenStreetMap)
2) Filter by yoga, hot yoga, pilates, barre, wellness studios
3) Confirm actual class schedule and pricing on the studio website
4) Use the web research helper to capture candidate studios and pricing hints

Web research helper:
- Run `python analysis\web_research.py` to gather candidate competitors into `data\web_candidates.csv`
- Review and map candidates into `data\competitors_template.csv` and `data\offers_template.csv`

## Variables to capture
Competitor-level
- brand/name, website, address, neighborhood
- travel time (walk/bike), tier
- segment (boutique studio, gym chain, community studio)
- proposition notes (focus, vibe, amenities)

Offer-level
- offer type: drop_in, pack, membership, intro, other
- class type: yoga, hot_yoga, pilates, barre, fitness, other
- heat: none, warm, hot
- class length (minutes)
- sessions included (for packs)
- duration in days (for packs or memberships)
- price (EUR)
- contract length, auto-renew, restrictions
- source URL, last checked date

## Normalized metrics
For each offer, compute:
- Price per class
  - Drop-in: price per class = price
  - Packs: price per class = price / sessions included
  - Memberships: price per class = price / assumed classes per month
- Monthly equivalent (for packs): price / duration_days * 30
- Effective discount vs drop-in

Suggested default assumptions (adjust in analysis):
- Assumed classes per month for memberships: 8 and 12 (sensitivity)

## Reporting outputs
- Tiered price ranges (min/median/max) by offer type
- Price index vs focal studio (e.g., 100 = focal studio)
- Value map: price per class vs proposition score (qualitative)

## Quality checks
- Confirm currency and VAT inclusion
- Ensure offer dates are current (last checked <= 30 days)
- Flag intro offers and limited-time promos separately
- Track changes over time using `data/offers_history.csv` and `data/web_candidates_history.csv`
