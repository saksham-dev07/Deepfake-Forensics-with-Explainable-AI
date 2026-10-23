# DeepForensics frontend

React 19 + Vite workspace for inspecting images and videos with 15 forensic signals. Results support review and do not establish authenticity, identity, or legal admissibility.

## Run and verify

Requires Node 20.19+ or 22.12+ and the project's running FastAPI backend.

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Production assets are generated in `dist/`.

```powershell
npm run lint
npm test
npm run build
```

Configure `VITE_API_URL` (default http://127.0.0.1:8000) and `VITE_API_KEY` to match the backend `API_KEY`. The bundled key is a shared client credential, not a user-specific secret. Private exhibits use signed backend links; PDF requests send `x-api-key`.

## Pages and navigation

- Analyze: keyboard-accessible upload and drag/drop, real progress, report overview, all applicable detector views, PDF export, and a new-audit action.
- Methodology: six stages with explicit observation limits.
- Models: implementation details and three archived benchmark JSON records with actual confusion counts and diagnostic curves. These are historical records, not fresh evaluations of the corrected pipeline.
- History: up to 20 browser-local summaries, search, demo reopening, and retained PDF downloads. Full real reports are not stored in local storage.

Sections use `#analyze`, `#methodology`, `#models`, and `#history`. Back/Forward preserves the active analysis. Reloading starts a new analysis session while saved history remains. The responsive layout wraps navigation, places report content before its sidebar on mobile, and brings a selected detector into sight with keyboard focus.

## Shared evidence presentation

`constants/diagnostics.js` registers detector fields, metrics, exhibits, applicability, and interpretation limits. Fourteen analytical tab wrappers use `ui/DiagnosticTab.jsx`; metadata and the combined overview have dedicated views. `utils/reportData.js` handles availability and numeric presentation. Missing/non-finite observations render N/A; valid zero values remain visible. Neutral scores with explicit observation warnings are unavailable. Near-zero/near-perfect percentages do not round to absolute certainty.

The overview shows returned detector scores and SHAP attributions. It does not invent a camera baseline, contributions, per-pixel measurements, or authenticity certification.

`utils/mediaUrl.js` owns all API/media and frontend public-asset paths. Original face and original frame resolvers accept explicit backend fields and sample fields only. Missing originals return null; no fabricated reference images or guessed artifact paths are used.

Only registered spatial exhibits with matching aspect ratios offer an A/B wipe. Neural attention uses its matching face crop; whole-frame diagnostics use `first_frame_path`. Charts, spectra, cropped diagnostics, and illustrative schematics use direct view. Opaque comparison layers prevent letterbox bleed. The shared `WipeDivider` keeps its 44 px pointer target within endpoints while the seam follows 0–100%. Pointer capture and grab offset preserve dragging; arrows, Shift+arrows, PageUp/PageDown, Home/End, and a labeled native range support keyboard operation.

Image failures offer retry. Missing exhibits have descriptive empty states. A native image dialog supports focus containment and Escape. Error boundaries contain view failures so navigation remains usable. Typography, contrast, touch targets, focus indicators, and reduced-motion rules are shared in `index.css`.

## Requests and state

`useAnalysisPipeline` owns each request session. Reset, replacement uploads/demos, and unmount abort requests and clear timers. Stale responses cannot overwrite a newer report. An interrupted/closed/stalled SSE stream falls back to bounded polling. Progress is clamped; logs accept validated strings or backend `{type,msg}` records. Stop watching ends browser updates; an accepted backend job can continue.

Uploads accept MP4/AVI/MOV/MKV/WEBM/JPG/JPEG/PNG/WEBP up to 100 MB. Empty files are rejected before a request. Missing job IDs and API errors render useful messages. Demos are explicitly illustrative and cannot export a PDF.

`utils/downloadReport.js` distinguishes pending (202), denied (401/403), and missing (404/410) reports. Only missing reports with an in-memory result can regenerate through `POST /api/reports/generate`. Requests have a 45-second timeout, abort when the view closes, and require PDF content type before download.

History validates stored entries, tolerates blocked/full storage, deduplicates jobs, and records demo provenance. It stores summaries rather than media or full report payloads.

## Verification

The frontend regression suite covers request races, cancellation, stream recovery, upload validation, malformed telemetry/storage, history, hash navigation, availability and zero values, PDF error handling, and populated/missing rendering of every detector. Comparison checks cover source coordinate selection, opaque layers, chart exclusions, and divider endpoints. SSR test servers disable WebSockets to avoid port conflicts.

Browser QA and remaining limits are recorded in [frontend audit](documentation/frontend_audit.md).
Detector jumps use immediate scrolling and disable report scroll anchoring so changing exhibit heights cannot pull mobile readers back toward the sidebar.

Wrapped navigation at tablet widths also offsets report jumps and the sticky source sidebar.

All three registered benchmark metrics files and diagnostic images ship in public/benchmark_artifacts. Regression checks verify these assets and confusion-matrix sample totals. Missing JSON is reported clearly even when the host responds with an HTML SPA fallback.

At phone and narrow tablet widths, a labeled native detector selector replaces the two rows of section/pill navigation, keeping evidence closer to the top and preserving access to every applicable detector and the overview.

The native selector retains keyboard focus while changing detectors, so arrow-key selection remains usable.

The face-geometry exhibit shows landmark positions rather than anomaly intensity. Its backend renderer now uses a translucent mesh instead of an overexposed glow. Previously saved exhibits require regeneration or a new scan to show the change.

