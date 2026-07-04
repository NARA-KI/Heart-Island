# Beta 0.9.9.7 Production Snapshot

This directory is a rollback snapshot created before the Heart Island v2.0 Alpha 1 integration work.

## Snapshot Metadata

- Source branch: `heart-island-sync-latest`
- Source commit: `f9614f5`
- Snapshot created: `2026-07-04`
- Original runtime entry: `index.html`
- Original core script: `app.js`
- Original stylesheet: `styles.css`
- Original launch method: serve the project root as a static H5 site, then open `index.html`

## Included Files

- `index.html`
- `app.js`
- `styles.css`
- `package.json`
- `core/scoring.mjs`
- `core/calibration-profiles.mjs`

## Notes

- This snapshot intentionally does not include `node_modules/`, temporary files, local test videos, or historical report archives.
- Existing shared visual assets remain in the root `assets/` directory and are not duplicated here.
- Do not edit this snapshot as part of v2 Alpha integration. Use it only for rollback/reference.
