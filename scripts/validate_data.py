#!/usr/bin/env python3
from __future__ import annotations
import json
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "grants.json"

def main() -> None:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    grants = payload.get("grants", [])
    ids: set[str] = set()
    errors: list[str] = []
    required = {"id", "name", "provider", "summary", "categories", "applicantTypes", "region", "deadlineType", "sourceUrl", "applyUrl", "verifiedAt"}
    for i, grant in enumerate(grants, 1):
        missing = required - grant.keys()
        if missing: errors.append(f"#{i} mangler: {', '.join(sorted(missing))}")
        if grant.get("id") in ids: errors.append(f"Duplikat-id: {grant.get('id')}")
        ids.add(grant.get("id", ""))
        for field in ("sourceUrl", "applyUrl"):
            parsed = urlparse(grant.get(field, ""))
            if parsed.scheme != "https" or not parsed.netloc: errors.append(f"{grant.get('id')}: ugyldig {field}")
        for deadline in grant.get("deadlines", []):
            try: datetime.fromisoformat(deadline)
            except ValueError: errors.append(f"{grant.get('id')}: ugyldig frist {deadline}")
        try: datetime.fromisoformat(grant.get("verifiedAt", ""))
        except ValueError: errors.append(f"{grant.get('id')}: ugyldig verifiedAt")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"OK: {len(grants)} støtteordninger, {len(ids)} unike id-er")

if __name__ == "__main__": main()
