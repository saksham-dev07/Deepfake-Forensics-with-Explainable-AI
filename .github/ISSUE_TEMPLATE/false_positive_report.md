---
name: False Positive / Negative Report
about: Report an authentic file flagged as fake, or a deepfake that bypassed detection
title: "[FORENSIC AUDIT] "
labels: ["forensic-accuracy", "dataset"]
assignees: ''
---

### Classification Anomaly Type
- [ ] **False Positive**: Authentic media incorrectly flagged as manipulated/fake.
- [ ] **False Negative**: Manipulated/synthetic media incorrectly passed as authentic.

### Suspect Media Characteristics
- **Generator / Tool** (if known): [e.g. Midjourney v6, ElevenLabs, Wav2Lip, Real Camera Capture]
- **Media Type**: [e.g. Video (MP4/H.264), Audio (WAV 16kHz), Image (JPEG Q=75)]
- **Resolution**: [e.g. 1920x1080, 512x512]
- **Duration**: [e.g. 12 seconds]

### Observed Detector Scores
Which specific detectors produced anomalous or contradictory readings?
- EfficientNet Spatial Score:
- Spectral / FFT Residual Score:
- rPPG Hemodynamic Pulse Score:
- SyncNet Audio-Visual Score:
- Meta-Classifier Final Verdict:

### Suspected Confounding Physical Factors
- [ ] Heavy lossy recompression (e.g. WhatsApp, TikTok re-encoding)
- [ ] Severe motion blur or defocus
- [ ] Extreme low light / high sensor ISO noise
- [ ] Unnatural studio lighting / multi-point glare
- [ ] Obscured landmarks / glasses / sunglasses
