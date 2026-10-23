# Frontend audit — 2026-10-17

## Outcome

The frontend now uses one registered evidence presentation path instead of duplicated per-detector renderers. Every applicable backend signal remains accessible. Missing observations, chart coordinates, demo provenance, historical benchmarks, and PDF failure states are explicit.

No new third-party dependency or backend algorithm change was introduced by this frontend overhaul. Historical benchmark figures are not fresh validation results.

## Changes by area

| Area | Root cause and change |
| --- | --- |
| Analytical tabs | Duplicated views invented fallback numbers and visual findings. Fourteen wrappers now share DiagnosticTab, the diagnostics registry, and reportData availability/formatting. |
| Comparison images | Full frames and cropped faces used incompatible coordinates; transparent letterboxes leaked the underlying image. Explicit source resolvers, registered spatial maps, aspect-ratio checks, and opaque layers fix the shared path. |
| Charts and schematics | Spectra, plots, cropped diagnostics, and illustrative diagrams cannot meaningfully wipe against a photograph. They use direct view. |
| Missing evidence | Missing values render N/A; missing images use an empty state. Guessed paths and procedural reference faces were removed. Zero remains a valid measurement. Failed images support retry. |
| Number presentation | Non-finite and out-of-range scores are unavailable. Near-zero and near-perfect percentages do not round to absolute certainty. Benchmarks use two decimal places. |
| Overview | Shows returned detector scores and SHAP influence; invented camera baselines, pixel readouts, simulated charts, and frontend authenticity-certification statements were removed. |
| Report navigation | All applicable metadata, motion, and voice outputs are reachable. Immediate detector jumps and disabled scroll anchoring prevent content-height changes from pulling the reader toward the sidebar. Narrow layouts use a native detector selector with keyboard focus retention. |
| Source details | Full case-ID copying, honest missing fields, source-crop expansion, and available-score counts. |
| Upload and processing | Empty files and missing backend IDs fail clearly. Request sessions prevent stale responses; progress is bounded and log records are validated. Stop watching describes browser-only cancellation. |
| PDF downloads | One shared request path distinguishes pending, denied, and missing reports. Missing-report regeneration requires the in-memory result. Timeout, abort, and PDF content-type checks prevent incorrect downloads. |
| History | Searchable browser-local summaries, clear empty results, demo reopening, and authenticated PDF downloads. Storage validation handles corrupt/full/blocked local storage. |
| Main navigation | Hash-based section links and browser Back/Forward retain the active analysis. Page titles and focus follow the current section. |
| Models | Implementation notes replace inaccurate architecture/simulation controls. Three archived benchmark JSON records provide actual sample totals and confusion counts. The missing Celeb-DF public JSON is now included. |
| Accessibility and resilience | Native modal with Escape and focus restoration; view error boundaries; focus indicators; reduced motion; accessible ranges; better text/button contrast; responsive headers, cards, tables, and metadata wrapping. |

## Automated verification

Run from frontend:

```powershell
npm run lint
npm test
npm run build
```

Final result: 20 tests passed; ESLint and the production build passed. The generated main application chunk is 78.77 kB, with a separately cached 202.11 kB React/vendor chunk and lazy detector/Models chunks.

The regression suite covers populated and missing detector data, correct original-image coordinates, chart exclusions, opaque comparison layers, divider endpoint bounds, real zero values, availability, benchmark asset presence and sample totals, PDF response handling, upload validation, request cancellation/races, SSE recovery/timeouts, malformed telemetry/storage, demo provenance, history limits, and hash navigation.

SSR test servers disable their WebSocket listener to avoid parallel test-port conflicts. Production build uses the existing React/Vite dependencies; detector and Models views load on demand.

## Browser verification

Tested in an isolated local in-app browser at 390 × 844, tablet/default panel width, and 1440 × 1000. Checks included:

- Homepage, Methodology, Models, History, and report layouts without horizontal document overflow at phone width.
- A real generated 3-second MP4 with audio uploaded through the file chooser, streamed progress, completed with 16 sampled frames, and displayed all 15 detector scores.
- All 15 detector views opened using sidebar controls and the compact mobile selector; headings, focus, and document width checked.
- Geometry source/overlay images both loaded at 256 × 256; shared divider keyboard endpoints stayed inside the image stage.
- Corneal composite and FFT spectrum exposed no inappropriate comparison slider.
- Native expanded-image modal closed with Escape and returned focus to its expand button.
- Report PDF export and History PDF download both completed.
- History search produced the expected empty-results state and cleared correctly; metadata filtering behaved likewise.
- All three benchmark datasets loaded actual JSON metrics and confusion counts after the public-asset correction.
- Browser Back returned from Models to the same completed report.

## Limits

This is functional and visual verification, not detection-accuracy validation. Archived benchmarks have not been rerun after pipeline corrections. Backend-generated explanations and scores remain backend output and must be interpreted with the displayed limitations.

Full real reports are not persisted in local storage; retained reports can be downloaded from History while the server keeps them. Reloading ends the in-memory analysis session. Expired signed exhibit links or server retention can make an old artifact unavailable. Accepted server jobs can continue after the client stops watching. Shared client API keys do not provide per-user authentication.