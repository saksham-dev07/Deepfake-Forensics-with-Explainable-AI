# Voice CNN architecture and checkpoint contract

**Implementation:** `backend/pipeline/voice_model.py`  
**Consumer:** `backend/pipeline/voice_spoofing.py`  
**Checkpoint:** `backend/weights/voice_spoofing.pth`  
**Interface:** `LightweightAudioAntiSpoof.load_weights(path=None)`, `.predict(mel_spectrogram)`.

## Research correspondence

[MobileNets](https://arxiv.org/html/1704.04861), Section3, motivates factorizing spatial filtering and channel mixing. This project uses that general depthwise/pointwise idea in a custom audio CNN. It is not the published MobileNet architecture and a matching ASVspoof reproduction has not been established. The former docstring attribution to Ma et al.'s *A Lightweight and Efficient Model for Audio Anti-Spoofing* was unsupported by code/provenance; the publisher's full text was unavailable during this review, so no implementation equivalence is claimed.

[ASVspoof2019](https://arxiv.org/html/1911.01601) is a speech countermeasure benchmark with defined attacks, speaker partitions and evaluation protocols. Having compatible tensor shapes or nonzero BatchNorm counters does not establish that this checkpoint was trained or validated on that benchmark. No training script, label convention, preprocessing manifest, held-out results or calibration record accompanies this state dictionary in the repository.

## Implemented topology

```text
[1,128,256] normalized mel
→ Conv3×3 1→16 / stride2 + BN + ReLU
→ depthwise3×3 + pointwise1×1 blocks: 16→32→64→128→128
→ global average pool →128→64→1 → sigmoid score
```

For spatial kernel size `K`, channels `M→N`, and spatial size `D`, standard convolution costs approximately `K²MND²`; factorized depthwise plus pointwise costs `K²MD²+MND²`. This explains the architecture's computational choice, without implying forensic accuracy. Existing parameters and state-dictionary keys are unchanged.

## Strict inference contract

`predict` requires successfully loaded weights and a finite 2D array of exactly `(128,256)`, normalized to `[0,1]`. Invalid dimensions, NaN/Infinity, or out-of-range inputs raise `ValueError` before inference. Inference adds batch/channel dimensions, follows the parameter device, enters evaluation and `torch.inference_mode`, and rejects outputs outside `[0,1]`, including NaN/Infinity.

`load_weights` defaults to the bundled path, loads with `weights_only=True`, rejects an empty/non-finite state dictionary, and strictly validates parameter keys/shapes. `weights_loaded` stays false if loading fails. The executable module entrypoint validates the existing checkpoint; it never writes random initial weights.

## Score semantics and ensemble integration

The sigmoid is an **uncalibrated checkpoint score**, not a verified probability of AI synthesis, identity mismatch, or deception. The wrapper exposes the raw score only as a diagnostic and marks `score_available=false`, `eligible_for_fusion=false`, `speech_verified=false`, `score_calibrated=false`. No raw anti-spoof score may force a combined100% result. The classifier vector's legacy voice position is11, not8; ineligible evidence uses its neutral compatibility value.

## Required evidence before operational use

Recover the training script, class labels, dataset/license, split IDs, exact mel/window normalization settings, checkpoint hash and held-out EER/min t-DCF (or deployment-appropriate metrics). Evaluate genuine speech across microphones/codecs/languages and modern unseen synthesis systems, and include music, tones, silence and background noise as out-of-domain inputs. Temperature or isotonic calibration and threshold changes require held-out data. This audit changes input safety and claims, not the learned architecture or weights.
