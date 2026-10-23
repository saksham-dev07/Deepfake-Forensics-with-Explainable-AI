# Backend pipeline audit — 2026-10-16

Reviewed all 23 Python files in `backend/pipeline`, their production callers in `main.py`, report consumers, existing specifications, and affected frontend displays. Changes address reproducible faults rather than inventing new detectors or retuning accuracy thresholds. No dependencies or pipeline modules were added.

## File-by-file assessment

| File | Assessment and changes |
| --- | --- |
| `__init__.py` | Reviewed package initialization; no change needed. |
| `audio_sync.py` | Corrected checkpoint preprocessing: 25 Hz sampling, PCM-scale reference MFCCs, unnormalized BGR pixels. Excluded missing mouth windows; bounded device allocations to eight windows per batch. Fixed final-window enumeration, initialization races, and invalid FPS. Removed invented `15 − distance` confidence; LSE-C and correlation are null. |
| `cfa_analysis.py` | Vectorized block variances; accepted actual `face_bbox` from the caller; required usable face/background regions. Tiny and constant inputs return neutral. Removed global pyplot state and incorrect reconstructed artifact paths. |
| `color_analysis.py` | Achromatic inputs return neutral with a warning. Descriptions identify whole-image chrominance measurements rather than claiming measured skin blood flow. |
| `corneal_analysis.py` | Missing highlights in either eye return neutral rather than artificial agreement. Preserved nested artifact paths; labeled fixed ray drawings illustrative. |
| `ela_analysis.py` | Replaced shared temporary JPEG filenames with in-memory encoding. Fixed uint8 overflow in all amplification paths and included final/partial blocks. |
| `ensemble_classifier.py` | Preserved real XGBoost/PyTorch prediction and SHAP integration from the earlier reliability fixes. Corrupt XGBoost checkpoints fall back to trained PyTorch weights; input batches require 15 finite values in [0,1]. Loading resets trained flags. |
| `eye_analysis.py` | Stopped closing the cached landmarker. Missing detections are gaps, not fabricated EAR values. Enforced minimum observation duration/coverage; corrected non-square image geometry. Isolated and optimized plotting. |
| `face_geometry.py` | Clamped face boxes at their shared source; supported meshes without iris points. Guarded empty crops, unwrapped head-pose angles, used per-frame dimensions, tracked valid sample indices, and omitted missing pose artifacts. Isolated/optimized temporal and radar plots. |
| `frequency_analysis.py` | Corrected high-frequency block-DCT mask; used equivalent orthonormal SciPy DCT for odd dimensions. Replaced repeated image scans with bincount radial averaging. Tiny/constant inputs return neutral; mini-chart dimensions are bounded. |
| `image_utils.py` | Validated image inputs and size limits; failed writes now raise. Added private-figure rendering under a lock, routed through the existing bounded image encoder. |
| `lighting_analysis.py` | Missing, non-finite, or rank-deficient SH fits and missing background gradients return neutral. Probe rendering fits small images. |
| `metadata_analysis.py` | Read failures are neutral; supported WEBM and bounded FFmpeg metadata inspection. Ordinary FFmpeg/Lavf encoder tags no longer imply manipulation. |
| `models.py` | Strict, weights-only visual checkpoint loading prevents partial random models. Shared inference/XAI locking protects mutable hooks/activations. Reviewed legacy `SyncNetAnalyzer`: unused neutral compatibility stub, not a detector. |
| `noise_analysis.py` | Preserved positive and negative denoising residuals; explicitly normalized visualization to uint8. Clarified that a denoising residual is not a verified device PRNU fingerprint. |
| `optical_flow.py` | Fixed failed-read capture release and empty ROI handling. Documented central-image fallback and actual DIS algorithm. Removed global pyplot state. |
| `pdf_reporter.py` | Matched noise/rPPG fields and SNR units to detector outputs; supported structured SHAP factors, real UTC, full job IDs, unavailable numeric values, inconclusive verdict coloring, and tall exhibits. Preserved confined signed exhibit loading. |
| `rppg_analysis.py` | Missing ROIs remain gaps. Filtering uses a sufficiently long contiguous measured run with coverage checks; constant observations remain unavailable. Bounded clip duration and optimized plotting; exposed availability. |
| `SyncNetModel.py` | Reviewed audio/lip convolution and embedding dimensions against callers and the bundled checkpoint. No architecture changes needed; incompatible shapes/checkpoints are rejected by strict loading. |
| `video_processor.py` | Still-image processing no longer resolves FFmpeg. Validated FPS/frame counts, bounded scene and FFmpeg processing, handled scene detection failures, deduplicated frame indices, and aligned zero-based output naming. |
| `voice_model.py` | Missing weights raise; prediction requires a successful strict load. Module execution validates existing weights rather than overwriting them with a randomly initialized checkpoint. |
| `voice_spoofing.py` | Model failures return neutral, never an authentic-looking fallback. Fixed cache initialization; bounded audio loading and guarded silence/non-finite samples. Corrected impossible >8 kHz reporting at 16 kHz sampling to 6.4–8 kHz and removed the unvalidated CNN veto. Exposed availability and optimized plots. |
| `xai_explainer.py` | Used actual model device and shared inference lock; restored original activations even on guided-backprop failure. Fixed non-JPEG output naming and failed-artifact paths. Removed fabricated legacy feature descriptions. |

## Integration and verification

`main.py` serializes lazy model creation and supplies CFA with the already detected face box. Audio, voice, and pulse tabs display unavailable measurements as N/A, respect neutral evidence, and use the backend’s frequency band and dimensionless pulse power ratio.

Regression tests in `backend/tests/test_pipeline_regressions.py` cover overflow, parallel JPEG analysis, signed residuals, cached detector ownership, absent faces/highlights, missing or incomplete weights, malformed features, temporal resampling and batch bounds, reference MFCC features, chrominance-free inputs, small-image failures, and unavailable report values. Existing API and inference tests remain part of validation.

The real-model smoke run used a generated three-second, 25 Hz video of the bundled scikit-image astronaut image with a synthetic 440 Hz audio track. It completed 16 sampled frames, all applicable detector calls, XAI, and PDF generation with `module_errors: []`. This checks execution and output integration; the fixture is not an authenticity benchmark.

MFCC preprocessing was compared with the upstream `python_speech_features` implementation on a deterministic PCM test signal: shape 13×29, maximum absolute error approximately 1.7×10⁻⁶. The golden first-frame vector is retained in regression tests; no extra runtime dependency is installed.

## Calibration limits

Corrected arithmetic changes feature distributions. Existing heuristic thresholds and ensemble training need evaluation on representative labeled images and videos before making accuracy claims. The ensemble’s procedural training data are not an independent validation set. Missing evidence uses the existing neutral 0.5 convention and must not be described as verified authenticity.

SyncNet reports aligned embedding distance. A temporal-offset search and its confidence are not implemented; LSE-C is null. Matching MFCC/pixel preprocessing does not validate the mouth crop or anomaly thresholds. Noise/CFA/color/lighting/corneal scores are approximate evidence, not standalone proofs of synthesis, camera identity, blood flow, or physical impossibility.

Reference contracts: [official SyncNet evaluator](https://github.com/joonson/syncnet_python/blob/master/SyncNetInstance.py), [MFCC reference](https://github.com/jameslyons/python_speech_features/blob/master/python_speech_features/base.py).

## Final check results

- Backend: 35 tests passed, including 24 pipeline regression tests.
- Frontend: 14 tests passed, including all 16 tabs with sample and unavailable data and the shared image-comparison regression; lint and production build passed.
- Python: all 23 pipeline files, `main.py`, and three test modules parsed successfully.
- Real-model video/audio smoke run: completed with 16 frames and no module errors.
- Existing dependency deprecation messages and server-rendered chart dimension warnings remain non-failing; they do not indicate measured forensic accuracy.

## Landmark visualization follow-up (2026-10-17)

Removed additive mesh glow that saturated small faces. Face-relative marks and a 25% convex overlay preserve unmarked source pixels; MediaPipe Tasks tessellation is supported. New regression checks source immutability, preserved background, shape, and bounded small-face brightness. Backend suite: 36 tests passed. Detection scores are unchanged.

