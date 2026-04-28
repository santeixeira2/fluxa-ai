"""SEC EDGAR earnings press release fetcher + Groq sentiment analysis."""

import asyncio
import json
import os
import re
from html.parser import HTMLParser
from typing import TypedDict

import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3-32b")
EDGAR_ARCHIVES = "https://www.sec.gov/Archives/edgar/data"
# EDGAR requires a User-Agent identifying the requester
_HEADERS = {"User-Agent": "Fluxa AI santhiago2k17@gmail.com"}

# Only US-listed stocks with EDGAR filings
SUPPORTED_TICKERS = frozenset({
    "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META",
    "NFLX", "BRK-B", "JPM", "V", "COIN",
})

_cik_cache: dict[str, str] = {}
_sentiment_cache: dict[str, "SentimentResult"] = {}


# ── CIK lookup ─────────────────────────────────────────────────────────────

async def _ticker_to_cik(ticker: str) -> str:
    if ticker in _cik_cache:
        return _cik_cache[ticker]

    async with httpx.AsyncClient(headers=_HEADERS, timeout=15) as client:
        res = await client.get("https://www.sec.gov/files/company_tickers.json")
        res.raise_for_status()
        data = res.json()

    for entry in data.values():
        if entry["ticker"].upper() == ticker.upper():
            cik = str(entry["cik_str"]).zfill(10)
            _cik_cache[ticker] = cik
            return cik

    raise ValueError(f"CIK not found for ticker: {ticker}")


# ── Filing list ─────────────────────────────────────────────────────────────

async def _fetch_earnings_filings(cik: str, count: int = 4) -> list[dict]:
    async with httpx.AsyncClient(headers=_HEADERS, timeout=15) as client:
        res = await client.get(f"https://data.sec.gov/submissions/CIK{cik}.json")
        res.raise_for_status()
        data = res.json()

    recent = data["filings"]["recent"]
    forms = recent["form"]
    items_list = recent.get("items", [""] * len(forms))
    accessions = recent["accessionNumber"]
    dates = recent["filingDate"]

    primary_docs = recent.get("primaryDocument", [""] * len(forms))

    results = []
    for form, items, accession, date, primary_doc in zip(
        forms, items_list, accessions, dates, primary_docs
    ):
        if form != "8-K":
            continue
        # Item 2.02 = "Results of Operations and Financial Condition" (earnings release)
        if "2.02" not in items:
            continue

        year, month = int(date[:4]), int(date[5:7])
        quarter = (month - 1) // 3 + 1
        results.append({
            "period": f"{year}-Q{quarter}",
            "date": date,
            "accession": accession,
            "primary_doc": primary_doc,
        })

        if len(results) >= count:
            break

    return results


# ── Exhibit text extraction ─────────────────────────────────────────────────

class _HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "head"):
            self._skip = True

    def handle_endtag(self, tag):
        if tag in ("script", "style", "head"):
            self._skip = False

    def handle_data(self, data):
        if not self._skip:
            self._parts.append(data)

    def text(self) -> str:
        return re.sub(r"\s+", " ", "".join(self._parts)).strip()


def _extract_exhibit_href(html: str, base_url: str) -> str | None:
    """Find the first Exhibit 99.1 href inside an 8-K primary document."""
    lower = html.lower()
    for marker in ("ex-99.1", "exhibit 99.1", "ex99-1", "ex991"):
        idx = lower.find(marker)
        while idx != -1:
            # Walk back to find the enclosing <a href="...">
            snippet_start = max(0, idx - 300)
            snippet = html[snippet_start: idx + 200]
            match = re.search(r'href=["\']([^"\']+\.htm[l]?)["\']', snippet, re.IGNORECASE)
            if match:
                href = match.group(1)
                # Make absolute if relative
                if not href.startswith("http"):
                    base = base_url.rsplit("/", 1)[0]
                    href = f"{base}/{href.lstrip('/')}"
                return href
            idx = lower.find(marker, idx + 1)
    return None


def _strip_html(raw: str) -> str:
    stripper = _HTMLStripper()
    stripper.feed(raw)
    return stripper.text()


async def _fetch_exhibit_text(cik: str, accession: str, primary_doc: str = "") -> str:
    acc_path = accession.replace("-", "")
    cik_int = int(cik)
    base = f"{EDGAR_ARCHIVES}/{cik_int}/{acc_path}"

    async with httpx.AsyncClient(headers=_HEADERS, timeout=30) as client:
        # Step 1: download the primary 8-K document
        primary_url = f"{base}/{primary_doc}" if primary_doc else f"{base}/{accession}.htm"
        res = await client.get(primary_url)
        if not res.is_success:
            return ""
        primary_html = res.text

        # Step 2: look for Exhibit 99.1 link inside it
        exhibit_url = _extract_exhibit_href(primary_html, primary_url)

        if exhibit_url:
            ex_res = await client.get(exhibit_url)
            if ex_res.is_success:
                raw = ex_res.text
            else:
                raw = primary_html  # fall back to primary doc
        else:
            raw = primary_html

    text = _strip_html(raw)
    words = text.split()
    if len(words) > 2000:
        text = " ".join(words[:2000]) + " ..."
    return text


# ── Groq sentiment ──────────────────────────────────────────────────────────

_SYSTEM = (
    "You are a financial analyst. Analyze earnings press releases and return structured JSON. "
    "Return ONLY valid JSON with no markdown fences or extra text."
)

_PROMPT = """\
Analyze the earnings press release below and return JSON with exactly these fields:
{
  "sentiment": <float -1.0 to 1.0, -1=very bearish, 0=neutral, 1=very bullish>,
  "guidance": <"raised" | "lowered" | "maintained" | "none">,
  "tone": <"confident" | "cautious" | "neutral">,
  "beats_estimates": <true | false | null if not mentioned>,
  "summary": <"2–3 sentence investor-focused summary in Portuguese">
}

Press release:
"""


async def _analyze_sentiment(text: str) -> dict:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set")

    for attempt in range(3):
        async with httpx.AsyncClient(timeout=60) as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": _SYSTEM},
                        {"role": "user", "content": _PROMPT + text},
                    ],
                    "response_format": {"type": "json_object"},
                    "reasoning_effort": "none",
                    "temperature": 0.1,
                    "max_tokens": 512,
                },
            )
        if res.status_code == 429:
            await asyncio.sleep(8 * (attempt + 1))
            continue
        res.raise_for_status()
        return json.loads(res.json()["choices"][0]["message"]["content"])

    raise RuntimeError("Groq rate limit exceeded after retries")


# ── Public interface ────────────────────────────────────────────────────────

class SentimentQuarter(TypedDict):
    period: str
    date: str
    sentiment: float
    guidance: str
    tone: str
    beats_estimates: bool | None
    summary: str


class SentimentResult(TypedDict):
    ticker: str
    available: bool
    quarters: list[SentimentQuarter]
    error: str | None


async def get_earnings_sentiment(ticker: str) -> SentimentResult:
    ticker_upper = ticker.upper()

    if ticker_upper not in SUPPORTED_TICKERS:
        return SentimentResult(ticker=ticker, available=False, quarters=[], error="not_supported")

    if ticker_upper in _sentiment_cache:
        return _sentiment_cache[ticker_upper]

    try:
        cik = await _ticker_to_cik(ticker_upper)
        filings = await _fetch_earnings_filings(cik, count=4)
    except Exception as exc:
        return SentimentResult(ticker=ticker, available=False, quarters=[], error=str(exc))

    if not filings:
        return SentimentResult(ticker=ticker, available=False, quarters=[], error="no_filings")

    quarters: list[SentimentQuarter] = []
    for filing in filings:
        try:
            text = await _fetch_exhibit_text(cik, filing["accession"], filing.get("primary_doc", ""))
            if not text or len(text) < 300:
                continue
            data = await _analyze_sentiment(text)
            quarters.append(SentimentQuarter(
                period=filing["period"],
                date=filing["date"],
                sentiment=float(data.get("sentiment", 0)),
                guidance=str(data.get("guidance", "none")),
                tone=str(data.get("tone", "neutral")),
                beats_estimates=data.get("beats_estimates"),
                summary=str(data.get("summary", "")),
            ))
        except Exception:
            continue

    result = SentimentResult(
        ticker=ticker,
        available=len(quarters) > 0,
        quarters=quarters,
        error=None,
    )
    if result["available"]:
        _sentiment_cache[ticker_upper] = result
    return result
