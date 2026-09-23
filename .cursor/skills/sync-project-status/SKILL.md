---
name: sync-project-status
description: Update docs/STATUS.md and docs/ROADMAP.md after project work. Use when finishing a feature, fixing a gap, or when the user asks for status/progress sync.
---

# Sync project status

## When

After completing work, or when the user says STATUS আপডেট / progress / কি বাকি.

## Steps

1. Read `docs/STATUS.md` and `docs/ROADMAP.md`.
2. Diff reality vs docs (code, not memory alone).
3. Update checkboxes and tables honestly.
4. Append one **Changelog** line with today’s date.
5. If a ROADMAP phase is fully done, mark its boxes.

## Rules

- Free-stack only; do not mark paid work as required.
- Put user-only actions under **Blocked on user**.
- Keep Bangla product terms (কিনলাম, বিক্রি, স্টক) when listing UI items.
