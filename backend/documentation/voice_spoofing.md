# Voice spoofing diagnostic

**Implementation:** `backend/pipeline/voice_spoofing.py`  
**Interface:** `analyze_voice_spoofing(audio_path, output_dir, prefix="voice")`  
**Dependencies:** librosa, NumPy, PyTorch and Matplotlib; project `voice_model` and image utilities.

## Scope and research foundation

The [ASVspoof2019 database and protocol paper](https://arxiv.org/html/1911.01601), especially its logical-access scenario and evaluation sections, concerns bona fide versus synthesized/converted **speech** under specified protocols. A musical tone does not become a voice-cloning example merely because its CNN score is high. This project has no general speech detector and the bundled custom CNN has no accompanying training provenance or calibration report; see [the model contract](voice_model.md).

```text
decoded16 kHz mono audio (≤60s)
→ validity/silence guard → unchanged sample waveform
→ power summaries + normalized128-bin mel spectrogram
→ first256 mel frames, zero padded if short → checkpoint score
→ applicability flags, warnings and descriptive visualization
```

## Signal and preprocessing contracts

Missing files, decoding failures, non-finite samples, silence and duration below1 second return unavailable, with neutral compatibility score .5. The decoded waveform is retained. Samples near full scale generate a warning; cubic interpolation, extrapolation and whole-signal renormalization were removed because they modify potential evidence and had no matching training contract. No denoising is applied.

Mel preprocessing preserves the existing checkpoint input: librosa128 mel bins at16 kHz, default2048-point FFT and512-sample hop, power-to-dB relative to the spectrogram peak, per-loaded-track min/max normalization, first256 frames and zero padding. It does not infer over a full60-second track. The last retained frame is centered at8.16 seconds; its STFT context extends beyond that center. For long tracks a warning distinguishes the CNN span from descriptive metrics/plot span. Global normalization currently depends on the loaded track, another reason to recover the training recipe before changing inference design.

Zero-crossing variance and85%-power spectral-rolloff mean are descriptive metrics. High-frequency ratio now consistently means **power** in6.4–8 kHz divided by total STFT power, rather than a sum of magnitudes mislabeled as energy. The reported high-frequency band is not10–16 kHz (which16 kHz sampling cannot represent).

A conservative applicability guard excludes a signal with over99.9% of interior STFT power in five bins centered on its strongest frequency. At16 kHz/2048 FFT these bins cover about39 Hz. This catches nearly pure test tones such as440 Hz. The threshold is an explicit narrow-band exclusion policy, not a calibrated speech classifier: passing it does not verify speech, and music/noise can still pass. All such scores remain ineligible for combined classification.

## Interface specification

Always returned: `available`, `voice_anomaly_score` (default.5), `score_available=false`, `eligible_for_fusion=false`, `speech_verified=false`, `score_calibrated=false`, `applicability="unverified_speech"`, `high_freq_ratio`, `high_freq_band_hz=[6400,8000]`, `zcr_variance`, `spectral_rolloff_mean`, `voice_plot_path` (default empty), `warnings`.

With usable audio: `analyzed_duration_seconds`, `inference_duration_seconds` (last selected mel-frame center, bounded by source duration), `narrowband_power_ratio`. Tone-like audio sets `applicability="narrowband_audio"`, leaves `available=false`, and skips CNN prediction. Decoding/model failures add `error`; model publication occurs only after successful loading under an initialization lock.

A finite in-range checkpoint response sets `available=true` and the raw `voice_anomaly_score`, adds `voice_plot_path` and a limited `explanation`. This does not change the false score/fusion eligibility flags. No descriptive metric is falsely presented as the causal explanation of a CNN decision. The output plot displays the unchanged waveform and mel spectrogram; waveform times use sample indices divided by sample rate. Figures are serialized with `save_optimized_figure`.

## Validation and remaining limits

Regression coverage checks440 Hz rejection, unchanged clipped samples through mel preprocessing, invalid output rejection, duration disclosure and checkpoint input guards. These are correctness/applicability checks, not accuracy results. A trained speech gate, known checkpoint provenance and held-out calibration are prerequisites for a deployable speech-spoofing probability. Narrow-band detection alone does not establish speech or guarantee music rejection.
