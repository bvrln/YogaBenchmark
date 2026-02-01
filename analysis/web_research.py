from __future__ import annotations

import argparse
import csv
import html
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qs, quote_plus, urlparse
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

DDG_SEARCH_URL = "https://duckduckgo.com/html/?q={query}&s={offset}"

DEFAULT_QUERIES = [
    "yoga studio Amsterdam",
    "hot yoga Amsterdam",
    "vinyasa yoga Amsterdam",
    "yin yoga Amsterdam",
    "pilates studio Amsterdam",
    "barre studio Amsterdam",
    "kundalini yoga Amsterdam",
]

CLASS_KEYWORDS = [
    "hot yoga",
    "bikram",
    "vinyasa",
    "hatha",
    "yin",
    "ashtanga",
    "kundalini",
    "rocket yoga",
    "power yoga",
    "pilates",
    "barre",
    "fitness",
]

OFFER_KEYWORDS = [
    "drop-in",
    "drop in",
    "single class",
    "intro",
    "trial",
    "membership",
    "unlimited",
    "class pack",
    "strippenkaart",
    "10-class",
    "10 class",
    "5-class",
    "5 class",
    "bundle",
]


@dataclass
class SearchResult:
    query: str
    rank: int
    url: str
    title: str
    snippet: str


def _fetch(url: str, timeout: int = 20) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def _extract_ddg_results(html_text: str, query: str) -> list[SearchResult]:
    results: list[SearchResult] = []
    pattern = re.compile(
        r'<a rel="nofollow" class="result__a" href="(?P<link>[^"]+)".*?>(?P<title>.*?)</a>',
        re.DOTALL,
    )
    snippet_pattern = re.compile(r'<a[^>]+class="result__snippet"[^>]*>(?P<snippet>.*?)</a>', re.DOTALL)

    links = pattern.findall(html_text)
    snippets = snippet_pattern.findall(html_text)

    for idx, match in enumerate(links):
        link, title = match
        url = _unwrap_ddg_link(link)
        snippet = snippets[idx] if idx < len(snippets) else ""
        results.append(
            SearchResult(
                query=query,
                rank=idx + 1,
                url=url,
                title=_clean_text(title),
                snippet=_clean_text(snippet),
            )
        )
    return results


def _unwrap_ddg_link(link: str) -> str:
    parsed = urlparse(link)
    if parsed.netloc.endswith("duckduckgo.com") and parsed.path == "/l/":
        qs = parse_qs(parsed.query)
        return qs.get("uddg", [link])[0]
    return link


def _clean_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _extract_prices(text: str) -> list[str]:
    prices = re.findall(r"€\s?\d+[.,]?\d*", text)
    return list(dict.fromkeys(prices))


def _extract_postcode(text: str) -> str | None:
    match = re.search(r"\b\d{4}\s?[A-Z]{2}\b", text)
    return match.group(0) if match else None


def _extract_phone(text: str) -> str | None:
    match = re.search(r"(\+31|0)\s?\d{1,3}[\s.-]?\d{3}[\s.-]?\d{3,4}", text)
    return match.group(0) if match else None


def _find_keywords(text: str, keywords: Iterable[str]) -> list[str]:
    lower = text.lower()
    found = [kw for kw in keywords if kw in lower]
    return list(dict.fromkeys(found))


def _extract_candidate_fields(url: str, title: str, snippet: str) -> dict[str, str]:
    try:
        page = _fetch(url)
    except Exception:
        return {
            "website": url,
            "title": title,
            "snippet": snippet,
            "price_snippets": "",
            "class_keywords": "",
            "offer_keywords": "",
            "postcode_guess": "",
            "phone_guess": "",
        }

    text = _clean_text(page)
    prices = _extract_prices(text)
    class_hits = _find_keywords(text, CLASS_KEYWORDS)
    offer_hits = _find_keywords(text, OFFER_KEYWORDS)
    postcode = _extract_postcode(text) or ""
    phone = _extract_phone(text) or ""

    return {
        "website": url,
        "title": title,
        "snippet": snippet,
        "price_snippets": " | ".join(prices[:10]),
        "class_keywords": " | ".join(class_hits),
        "offer_keywords": " | ".join(offer_hits),
        "postcode_guess": postcode,
        "phone_guess": phone,
    }


def ddg_search(query: str, max_results: int, delay: float) -> list[SearchResult]:
    results: list[SearchResult] = []
    offset = 0
    while len(results) < max_results:
        url = DDG_SEARCH_URL.format(query=quote_plus(query), offset=offset)
        html_text = _fetch(url)
        batch = _extract_ddg_results(html_text, query)
        if not batch:
            break
        results.extend(batch)
        offset += len(batch)
        time.sleep(delay)
    return results[:max_results]


def main() -> None:
    parser = argparse.ArgumentParser(description="Web research for yoga studio pricing benchmark.")
    parser.add_argument("--query", action="append", help="Additional query to search. Can repeat.")
    parser.add_argument("--queries-file", type=Path, help="Optional file with queries (one per line).")
    parser.add_argument("--max-results", type=int, default=20, help="Max results per query.")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between search page requests.")
    parser.add_argument(
        "--output",
        type=Path,
        default=DATA_DIR / "web_candidates.csv",
        help="CSV output for candidate list.",
    )
    args = parser.parse_args()

    queries: list[str] = []
    if args.queries_file and args.queries_file.exists():
        queries.extend([line.strip() for line in args.queries_file.read_text(encoding="utf-8").splitlines() if line.strip()])
    if args.query:
        queries.extend(args.query)
    if not queries:
        queries = DEFAULT_QUERIES

    all_results: list[SearchResult] = []
    seen_urls: set[str] = set()

    for query in queries:
        results = ddg_search(query, max_results=args.max_results, delay=args.delay)
        for result in results:
            if result.url in seen_urls:
                continue
            seen_urls.add(result.url)
            all_results.append(result)

    if not all_results:
        print("No results found. Try different queries.")
        sys.exit(1)

    output_path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "query",
                "rank",
                "website",
                "title",
                "snippet",
                "price_snippets",
                "class_keywords",
                "offer_keywords",
                "postcode_guess",
                "phone_guess",
            ],
        )
        writer.writeheader()
        for result in all_results:
            row = _extract_candidate_fields(result.url, result.title, result.snippet)
            row.update({"query": result.query, "rank": result.rank})
            writer.writerow(row)

    print(f"Wrote candidate list to {output_path}")


if __name__ == "__main__":
    main()
