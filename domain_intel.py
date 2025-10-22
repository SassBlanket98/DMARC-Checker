"""
Domain Intelligence Aggregator

Provides a unified interface to query one or more OSINT providers for domain-related leak
signals (e.g., stealer logs, credential exposures, mentions in breach datasets).

This module is designed to be safe-by-default: if no provider API keys are configured,
it returns a helpful "not configured" response instead of failing.

Supported (pluggable) providers:
- IntelligenceX (requires INTELX_API_KEY)
- LeakCheck.io (requires LEAKCHECK_API_KEY)

Notes:
- Provider integrations are intentionally conservative and minimal. Some vendors require
  multi-step workflows or paid tiers. The functions below attempt a light-touch query and
  return a structured summary when possible.
- You can extend `PROVIDERS` with additional sources and add corresponding async functions
  that return a normalized result shape.
"""
from __future__ import annotations

import os
import asyncio
from typing import Any, Dict, List, Tuple
import aiohttp

# Result shape contract (normalized):
# {
#   "provider": "intelx|leakcheck|...",
#   "configured": bool,
#   "status": "ok" | "not_configured" | "error",
#   "findings_count": int,
#   "findings": [
#       {
#         "type": "stealer_log|credential|mention|paste|unknown",
#         "title": str,
#         "source": str,      # dataset/source label
#         "date": str|null,   # ISO8601 or yyyy-mm-dd when available
#         "metadata": dict    # provider-specific extras (safe for UI)
#       },
#       ...
#   ],
#   "message": str | None,         # human-readable status/context
#   "error_code": str | None       # for diagnostics
# }

INTELX_API_KEY = os.getenv("INTELX_API_KEY")
# Allow overriding the base URL; default to IntelX free portal if provided by user
INTELX_BASE_URL = os.getenv("INTELX_BASE_URL", "https://free.intelx.io")
LEAKCHECK_API_KEY = os.getenv("LEAKCHECK_API_KEY")
# Allow overriding LeakCheck endpoint; default to the public API URL
LEAKCHECK_BASE_URL = os.getenv("LEAKCHECK_BASE_URL", "https://leakcheck.io/api/public")


def _guess_type_from_text(title: str, source: str) -> str:
    t = f"{title} {source}".lower()
    keywords = ["stealer", "redline", "raccoon", "vidar", "lumma", "risepro", "meta stealer", "lummastealer"]
    for kw in keywords:
        if kw in t:
            return "stealer_log"
    return "credential" if any(k in t for k in ["combo", "dump", "leak"]) else "mention"


async def _intelx_search(session: aiohttp.ClientSession, domain: str) -> Dict[str, Any]:
    if not INTELX_API_KEY:
        return {
            "provider": "intelx",
            "configured": False,
            "status": "not_configured",
            "findings_count": 0,
            "findings": [],
            "message": "IntelX API key not configured",
            "error_code": "PROVIDER_NOT_CONFIGURED",
        }

    # Minimal IntelX flow: search for the domain term across several variants.
    # Docs: https://github.com/IntelligenceX/SDK (reference) — API paths vary by plan.
    headers = {
        "User-Agent": "Neozeit-DMARC-Checker/1.0",
        "x-key": INTELX_API_KEY,
        "Content-Type": "application/json",
    }

    # Compose search URL from configurable base; path may vary by API version/plan
    search_url = f"{INTELX_BASE_URL.rstrip('/')}/intelligent/search"
    # Alternative newer endpoint (kept for reference):
    # search_url = f"{INTELX_BASE_URL.rstrip('/')}/v3/search"

    query_variants = [domain, f"@{domain}", f'"@{domain}"', f'"{domain}"']

    try:
        findings: List[Dict[str, Any]] = []
        for term in query_variants:
            payload = {"term": term, "maxresults": 10, "timeout": 10}
            async with session.post(search_url, json=payload, headers=headers) as resp:
                if resp.status not in (200, 202):
                    # Try next variant if this one is not accepted or yields an error
                    continue
                data = await resp.json(content_type=None)
                # Normalize candidates
                candidates: List[Any] = []
                if isinstance(data, dict):
                    for key in ("records", "result", "selectors", "items"):
                        if key in data and isinstance(data[key], list):
                            candidates = data[key]
                            break
                elif isinstance(data, list):
                    candidates = data

                for item in candidates[:10]:
                    if isinstance(item, dict):
                        title = item.get("name") or item.get("system") or "IntelX Result"
                        date = item.get("date") or item.get("timestamp")
                        source = item.get("bucket") or item.get("source") or "IntelX"
                        ftype = _guess_type_from_text(str(title), str(source))
                        findings.append({
                            "type": ftype,
                            "title": str(title),
                            "source": str(source),
                            "date": str(date) if date else None,
                            "metadata": {k: v for k, v in item.items() if k not in ("name", "system", "bucket", "source", "date", "timestamp")},
                        })
                    else:
                        t = str(item)
                        findings.append({
                            "type": _guess_type_from_text(t, "IntelX"),
                            "title": t,
                            "source": "IntelX",
                            "date": None,
                            "metadata": {"raw": t},
                        })

        if findings:
            # Deduplicate by title+source
            seen = set()
            unique: List[Dict[str, Any]] = []
            for f in findings:
                key = (f.get("title"), f.get("source"))
                if key not in seen:
                    seen.add(key)
                    unique.append(f)
            findings = unique

            return {
                "provider": "intelx",
                "configured": True,
                "status": "ok",
                "findings_count": len(findings),
                "findings": findings,
                "message": None,
                "error_code": None,
            }

        # If all queries produced no results or non-200 responses
        return {
            "provider": "intelx",
            "configured": True,
            "status": "ok",
            "findings_count": 0,
            "findings": [],
            "message": "No results returned for tried query variants",
            "error_code": None,
        }
    except asyncio.TimeoutError:
        return {
            "provider": "intelx",
            "configured": True,
            "status": "error",
            "findings_count": 0,
            "findings": [],
            "message": "IntelX request timed out",
            "error_code": "INTELX_TIMEOUT",
        }
    except aiohttp.ClientError as e:
        return {
            "provider": "intelx",
            "configured": True,
            "status": "error",
            "findings_count": 0,
            "findings": [],
            "message": f"IntelX network error: {e}",
            "error_code": "INTELX_NETWORK_ERROR",
        }
    except Exception as e:
        return {
            "provider": "intelx",
            "configured": True,
            "status": "error",
            "findings_count": 0,
            "findings": [],
            "message": f"IntelX unexpected error: {e}",
            "error_code": "INTELX_UNEXPECTED_ERROR",
        }


async def _leakcheck_search(session: aiohttp.ClientSession, domain: str) -> Dict[str, Any]:
    if not LEAKCHECK_API_KEY:
        return {
            "provider": "leakcheck",
            "configured": False,
            "status": "not_configured",
            "findings_count": 0,
            "findings": [],
            "message": "LeakCheck API key not configured",
            "error_code": "PROVIDER_NOT_CONFIGURED",
        }

    # LeakCheck API semantics vary by account. We'll attempt a conservative domain query.
    # Reference: https://leakcheck.io/documentation (subject to change)
    # Example pattern (may require paid plan): GET https://leakcheck.io/api/public
    # We'll use a POST with JSON to be safe with params.
    headers = {
        "User-Agent": "Neozeit-DMARC-Checker/1.0",
    }

    url = LEAKCHECK_BASE_URL
    # Try a few variants: domain and @domain
    variants = [
        {"check": domain, "type": "domain"},
        {"check": f"@{domain}", "type": "email"},
    ]

    try:
        collected: List[Dict[str, Any]] = []
        for v in variants:
            common = {"key": LEAKCHECK_API_KEY, "limit": 10}
            post_body = {**common, **v}
            # Primary attempt: POST JSON
            async with session.post(url, json=post_body, headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json(content_type=None)
                else:
                    # Fallback: try GET with query params
                    params = {**common, **v}
                    async with session.get(url, params=params, headers=headers) as get_resp:
                        if get_resp.status != 200:
                            continue
                        data = await get_resp.json(content_type=None)
            # Common LeakCheck response fields: 'found', 'sources', 'data' etc.
            records = []
            if isinstance(data, dict):
                entries = data.get("data") or data.get("result") or []
                if isinstance(entries, list):
                    for item in entries[:10]:
                        # Attempt to normalize
                        title = item.get("line") or item.get("source") or item.get("email") or "LeakCheck Hit"
                        date = item.get("date") or item.get("time")
                        src = item.get("source") or "LeakCheck"
                        rec_type = _guess_type_from_text(str(title), str(src))
                        records.append({
                            "type": rec_type,
                            "title": str(title),
                            "source": str(src),
                            "date": str(date) if date else None,
                            "metadata": {k: v for k, v in item.items() if k not in ("line", "source", "date", "time")},
                        })
            collected.extend(records)
        # Deduplicate collected
        if collected:
            seen = set()
            unique: List[Dict[str, Any]] = []
            for f in collected:
                key = (f.get("title"), f.get("source"))
                if key not in seen:
                    seen.add(key)
                    unique.append(f)
            collected = unique

        return {
            "provider": "leakcheck",
            "configured": True,
            "status": "ok",
            "findings_count": len(collected),
            "findings": collected,
            "message": None if collected else "No results returned for tried query variants",
            "error_code": None,
        }
    except asyncio.TimeoutError:
        return {
            "provider": "leakcheck",
            "configured": True,
            "status": "error",
            "findings_count": 0,
            "findings": [],
            "message": "LeakCheck request timed out",
            "error_code": "LEAKCHECK_TIMEOUT",
        }
    except aiohttp.ClientError as e:
        return {
            "provider": "leakcheck",
            "configured": True,
            "status": "error",
            "findings_count": 0,
            "findings": [],
            "message": f"LeakCheck network error: {e}",
            "error_code": "LEAKCHECK_NETWORK_ERROR",
        }
    except Exception as e:
        return {
            "provider": "leakcheck",
            "configured": True,
            "status": "error",
            "findings_count": 0,
            "findings": [],
            "message": f"LeakCheck unexpected error: {e}",
            "error_code": "LEAKCHECK_UNEXPECTED_ERROR",
        }


async def search_domain_intel(domain: str) -> Dict[str, Any]:
    """Query all configured providers concurrently and return a merged summary."""
    results: List[Dict[str, Any]] = []

    timeout = aiohttp.ClientTimeout(total=20)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        provider_tasks = [
            _intelx_search(session, domain),
            _leakcheck_search(session, domain),
        ]
        results = await asyncio.gather(*provider_tasks, return_exceptions=False)

    # Build summary
    total = sum(r.get("findings_count", 0) for r in results if isinstance(r, dict))
    categories: Dict[str, int] = {}
    for r in results:
        for f in r.get("findings", []):
            categories[f.get("type", "unknown")] = categories.get(f.get("type", "unknown"), 0) + 1

    return {
        "domain": domain,
        "providers": {r.get("provider", f"provider_{i}"): r for i, r in enumerate(results)},
        "summary": {
            "total_findings": total,
            "categories": categories,
        },
    }
