"""B3 earnings sentiment via CVM ITR structured DRE data + Groq."""

import asyncio
import csv
import io
import json
import os
import re
import time
import zipfile
from datetime import datetime
from pathlib import Path
from typing import TypedDict

import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3-32b")

_CACHE_DIR = Path(os.getenv("ML_CACHE_DIR", "/tmp/fluxa_ml_cache"))
_CACHE_DIR.mkdir(parents=True, exist_ok=True)

_CVM_ZIP_TTL = 7 * 24 * 3600   # re-download CVM zip every 7 days
_SENTIMENT_TTL = 24 * 3600

_HEADERS = {"User-Agent": "Fluxa AI santhiago2k17@gmail.com"}

# B3 ticker (no .SA suffix) → CNPJ formatted as in CVM files
B3_TICKERS: dict[str, str] = {
    "PETR4": "33.000.167/0001-01",
    "VALE3": "33.592.510/0001-54",
    "ITUB4": "60.872.504/0001-23",
    "BBDC4": "60.746.948/0001-12",
    "BBAS3": "00.000.000/0001-91",
    "WEGE3": "84.429.695/0001-11",
    "MGLU3": "47.960.950/0001-21",
    "B3SA3": "09.346.601/0001-25",
}
SUPPORTED_B3_TICKERS = frozenset(B3_TICKERS.keys())

# CVM standard DRE account codes (parent codes, exact match)
_DRE_ACCOUNTS: dict[str, str] = {
    "3.01": "receita_liquida",
    "3.03": "resultado_bruto",
    "3.05": "ebit",
    "3.11": "lucro_liquido",
}

_sentiment_cache: dict[str, "SentimentResult"] = {}


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


# ── Disk cache ──────────────────────────────────────────────────────────────

def _b3_cache_path(ticker: str) -> Path:
    return _CACHE_DIR / f"b3_sentiment_{ticker}.json"


def _load_disk_cache(ticker: str) -> "SentimentResult | None":
    path = _b3_cache_path(ticker)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
        if time.time() - data.get("_cached_at", 0) > _SENTIMENT_TTL:
            path.unlink(missing_ok=True)
            return None
        data.pop("_cached_at", None)
        return data  # type: ignore[return-value]
    except Exception:
        return None


def _save_disk_cache(ticker: str, result: "SentimentResult") -> None:
    try:
        payload = {**result, "_cached_at": time.time()}
        _b3_cache_path(ticker).write_text(json.dumps(payload, ensure_ascii=False))
    except Exception:
        pass


# ── CVM ITR DRE data fetch ──────────────────────────────────────────────────

def _cvm_zip_url(year: int) -> str:
    return f"https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_con_{year}.zip"


def _zip_cache_path(year: int) -> Path:
    return _CACHE_DIR / f"cvm_itr_con_{year}.zip"


async def _fetch_year_zip(year: int) -> bytes:
    path = _zip_cache_path(year)
    if path.exists() and (time.time() - path.stat().st_mtime) < _CVM_ZIP_TTL:
        return path.read_bytes()

    async with httpx.AsyncClient(timeout=120, headers=_HEADERS) as client:
        resp = await client.get(_cvm_zip_url(year))
        resp.raise_for_status()
        data = resp.content

    path.write_bytes(data)
    return data


def _parse_vl(s: str) -> float | None:
    s = s.strip()
    if not s:
        return None
    # CVM may use comma as decimal separator: "1.234.567,89" → 1234567.89
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


class _DRERow(TypedDict):
    dt_refer: str
    dt_ini: str
    dt_fim: str
    order: str      # "ÚLTIMO" or "PENÚLTIMO"
    cd_conta: str
    vl_conta: float


def _extract_dre_rows(zip_bytes: bytes, cnpj: str) -> list[_DRERow]:
    rows: list[_DRERow] = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        dre_names = [
            n for n in z.namelist()
            if re.search(r"DRE.*con", n, re.IGNORECASE) and n.endswith(".csv")
        ]
        if not dre_names:
            return []

        with z.open(dre_names[0]) as f:
            content = f.read().decode("iso-8859-1", errors="replace")

        reader = csv.DictReader(io.StringIO(content), delimiter=";")
        for row in reader:
            if row.get("CNPJ_CIA", "").strip() != cnpj:
                continue
            cd = row.get("CD_CONTA", "").strip()
            if cd not in _DRE_ACCOUNTS:
                continue
            vl = _parse_vl(row.get("VL_CONTA", ""))
            if vl is None:
                continue
            rows.append(_DRERow(
                dt_refer=row.get("DT_REFER", "").strip(),
                dt_ini=row.get("DT_INI_EXERC", "").strip(),
                dt_fim=row.get("DT_FIM_EXERC", "").strip(),
                order=row.get("ORDEM_EXERC", "ÚLTIMO").strip(),
                cd_conta=cd,
                vl_conta=vl,
            ))

    return rows


class _PeriodMetrics(TypedDict):
    dt_refer: str
    dt_fim: str
    receita_liquida: float | None
    resultado_bruto: float | None
    ebit: float | None
    lucro_liquido: float | None


def _group_periods(rows: list[_DRERow], order_filter: str = "ÚLTIMO") -> list[_PeriodMetrics]:
    """Group DRE rows by reference date, keeping only the specified ORDEM_EXERC."""
    by_period: dict[str, dict] = {}

    for row in rows:
        if row["order"].upper().replace("I", "I") not in (order_filter.upper(), "ULTIMO", "ÚLTIMO"):
            continue
        key = row["dt_refer"]
        if key not in by_period:
            by_period[key] = {"dt_refer": row["dt_refer"], "dt_fim": row["dt_fim"]}
        metric = _DRE_ACCOUNTS.get(row["cd_conta"])
        if metric:
            by_period[key][metric] = row["vl_conta"]

    result = [
        _PeriodMetrics(
            dt_refer=p["dt_refer"],
            dt_fim=p.get("dt_fim", ""),
            receita_liquida=p.get("receita_liquida"),
            resultado_bruto=p.get("resultado_bruto"),
            ebit=p.get("ebit"),
            lucro_liquido=p.get("lucro_liquido"),
        )
        for p in by_period.values()
    ]

    result.sort(key=lambda p: p["dt_refer"], reverse=True)
    return result


def _quarter_label(dt_refer: str) -> str:
    try:
        month = int(dt_refer[5:7])
        year = dt_refer[:4]
        return f"{year}-Q{(month - 1) // 3 + 1}"
    except Exception:
        return dt_refer[:7]


# ── Groq analysis ───────────────────────────────────────────────────────────

_SYSTEM = (
    "Você é um analista financeiro especializado em empresas brasileiras listadas na B3. "
    "Analise dados financeiros de ITR (CVM) e retorne JSON estruturado. "
    "Valores em R$ bilhões (acumulado no período). "
    "Retorne APENAS JSON válido, sem markdown."
)

_PROMPT_TMPL = """\
Analise os dados financeiros abaixo e retorne um JSON com análise de sentimento de cada período.

Empresa: {ticker}
Fonte: CVM ITR — Demonstração de Resultado Consolidado (acumulado desde o início do exercício)

{data_block}

Retorne JSON com exatamente este formato:
{{
  "quarters": [
    {{
      "period": "<YYYY-QN>",
      "date": "<YYYY-MM-DD igual ao dt_refer do período>",
      "sentiment": <float -1.0 a 1.0, -1=muito negativo, 0=neutro, 1=muito positivo>,
      "guidance": "none",
      "tone": <"confident" | "cautious" | "neutral">,
      "beats_estimates": null,
      "summary": "<resumo de 2 frases em português descrevendo o desempenho>"
    }}
  ]
}}

Instruções:
- "guidance" é sempre "none" — ITR não contém guidance explícito de gestão
- "beats_estimates" é sempre null — sem consenso de mercado disponível
- Base o "sentiment" e "tone" nas variações YoY de receita, margem e lucro
- Emita um objeto por período fornecido, na mesma ordem
"""


def _fmt_b(v: float | None) -> str:
    if v is None:
        return "n/d"
    return f"R$ {v / 1_000_000:.2f}B"  # CVM values are in R$ thousands


def _pct(curr: float | None, prev: float | None) -> str:
    if curr is None or prev is None or prev == 0:
        return ""
    pct = (curr - prev) / abs(prev) * 100
    sign = "+" if pct >= 0 else ""
    return f" ({sign}{pct:.1f}% YoY)"


def _build_data_block(
    current: list[_PeriodMetrics],
    prior: list[_PeriodMetrics],
) -> str:
    lines: list[str] = []

    for p in current[:3]:
        label = _quarter_label(p["dt_refer"])
        prev = next((x for x in prior if x["dt_fim"][5:] == p["dt_fim"][5:]), None)

        lines.append(f"\n[{label} — acumulado até {p['dt_fim']}]")
        lines.append(f"  Receita Líquida: {_fmt_b(p['receita_liquida'])}{_pct(p['receita_liquida'], prev['receita_liquida'] if prev else None)}")
        lines.append(f"  Resultado Bruto: {_fmt_b(p['resultado_bruto'])}{_pct(p['resultado_bruto'], prev['resultado_bruto'] if prev else None)}")
        lines.append(f"  EBIT: {_fmt_b(p['ebit'])}{_pct(p['ebit'], prev['ebit'] if prev else None)}")
        lines.append(f"  Lucro Líquido: {_fmt_b(p['lucro_liquido'])}{_pct(p['lucro_liquido'], prev['lucro_liquido'] if prev else None)}")

    return "\n".join(lines)


async def _call_groq(ticker: str, current: list[_PeriodMetrics], prior: list[_PeriodMetrics]) -> list[SentimentQuarter]:
    data_block = _build_data_block(current, prior)
    if not data_block.strip():
        return []

    prompt = _PROMPT_TMPL.format(ticker=ticker, data_block=data_block)

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
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "reasoning_effort": "none",
                    "temperature": 0.1,
                    "max_tokens": 1000,
                },
            )
        if res.status_code == 429:
            await asyncio.sleep(8 * (attempt + 1))
            continue
        res.raise_for_status()
        break

    raw = res.json()["choices"][0]["message"]["content"]
    quarters_raw = json.loads(raw).get("quarters", [])

    return [
        SentimentQuarter(
            period=str(q.get("period", "")),
            date=str(q.get("date", "")),
            sentiment=float(q.get("sentiment", 0)),
            guidance=str(q.get("guidance", "none")),
            tone=str(q.get("tone", "neutral")),
            beats_estimates=q.get("beats_estimates"),
            summary=str(q.get("summary", "")),
        )
        for q in quarters_raw
    ]


# ── Public interface ────────────────────────────────────────────────────────

async def get_b3_earnings_sentiment(ticker: str) -> SentimentResult:
    # Strip Yahoo Finance .SA suffix if present
    ticker_clean = re.sub(r"\.SA$", "", ticker.upper())

    if ticker_clean not in B3_TICKERS:
        return SentimentResult(ticker=ticker_clean, available=False, quarters=[], error="not_supported")

    if ticker_clean in _sentiment_cache:
        return _sentiment_cache[ticker_clean]

    cached = _load_disk_cache(ticker_clean)
    if cached is not None:
        _sentiment_cache[ticker_clean] = cached
        return cached

    cnpj = B3_TICKERS[ticker_clean]
    current_year = datetime.now().year

    zips = await asyncio.gather(
        _fetch_year_zip(current_year),
        _fetch_year_zip(current_year - 1),
        return_exceptions=True,
    )

    current_rows: list[_DRERow] = []
    prior_rows: list[_DRERow] = []

    if not isinstance(zips[0], Exception):
        current_rows = _extract_dre_rows(zips[0], cnpj)  # type: ignore[arg-type]
    if not isinstance(zips[1], Exception):
        prior_rows = _extract_dre_rows(zips[1], cnpj)  # type: ignore[arg-type]

    current_periods = _group_periods(current_rows)
    prior_periods = _group_periods(prior_rows)

    if not current_periods:
        return SentimentResult(ticker=ticker_clean, available=False, quarters=[], error="no_data")

    try:
        quarters = await _call_groq(ticker_clean, current_periods, prior_periods)
    except Exception as exc:
        return SentimentResult(ticker=ticker_clean, available=False, quarters=[], error=str(exc))

    result = SentimentResult(
        ticker=ticker_clean,
        available=len(quarters) > 0,
        quarters=quarters,
        error=None,
    )

    if result["available"]:
        _sentiment_cache[ticker_clean] = result
        _save_disk_cache(ticker_clean, result)

    return result
