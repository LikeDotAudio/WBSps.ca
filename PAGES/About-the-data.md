---
type: "index"
title: "About the data"
---

# About the data

This wiki is generated from the archive in `WBSps.env` (never modified) by `timelines/run_all.sh`. Do not hand-edit generated pages; they are rewritten on every run. Add your own pages with new names.

- **Database:** `timelines/wbs_timeline.db` (SQLite) — see `timelines/README.md` for every table.
- **Data files:** `timelines/data/*.csv`, `timelines/data/timeline.json`.
- **File history:** every JSON about a file is stored in order in the `blobs` table / `file_history` view.
- **Per-file notes:** every copied file has a `.md` note beside it with its year, origin and the dates found in it.

## How dates are decided

| Item | Source | Confidence |
|---|---|---|
| Job / serial number | first two digits | certain |
| Module / product | earliest dated document: title-block `DATE`, `MANUAL ISSUE`, ©, month + year | high / medium |
| No printed date | earliest job that references it | low |
| Undated variant | earliest dated sibling (M402 ← M402B) | family |

PDF creation dates (2003–2018 scans) are never used as design dates.
