#!/usr/bin/env python3
"""Ruller faste årlige frister frem og oppdaterer genereringstidspunktet.

Dette skriptet endrer ikke vilkår eller gjetter nye engangsfrister. De må fortsatt
kontrolleres mot den offisielle kilden. Kjøring via GitHub Actions sørger for at
årlige mønstre alltid har fremtidige datoer i databasen.
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "grants.json"
OSLO = ZoneInfo("Europe/Oslo")

def main() -> None:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    now = datetime.now(OSLO)
    for grant in payload.get("grants", []):
        recurrence = grant.get("recurrence")
        if not recurrence or recurrence.get("type") != "annual_dates":
            continue
        horizon = int(recurrence.get("horizonYears", 2))
        generated: set[str] = set(grant.get("deadlines", []))
        for year in range(now.year, now.year + horizon + 1):
            for item in recurrence.get("dates", []):
                hour, minute = map(int, item.get("time", "23:59").split(":"))
                dt = datetime(year, int(item["month"]), int(item["day"]), hour, minute, tzinfo=OSLO)
                generated.add(dt.isoformat())
        cutoff = datetime(now.year - 1, 1, 1, tzinfo=OSLO)
        grant["deadlines"] = sorted(value for value in generated if datetime.fromisoformat(value) >= cutoff)
    payload.setdefault("meta", {})["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    DATA.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Frister rullet frem.")

if __name__ == "__main__": main()
