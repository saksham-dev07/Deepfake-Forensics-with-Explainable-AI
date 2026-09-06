## Pull Request Summary

### Description of Changes
A concise summary of the modifications introduced in this PR.

### Impacted Subsystems & Forensic Modules
- [ ] Visual Backbone (`backend/pipeline/models.py`)
- [ ] Meta-Classifier & SHAP (`backend/pipeline/ensemble_classifier.py`)
- [ ] Physics & Sensor Detectors (FFT / ELA / PRNU / CFA)
- [ ] Biological & Kinematic Detectors (rPPG / EAR Eye Blink)
- [ ] Cross-Modal & Audio (SyncNet / Voice Anti-Spoofing)
- [ ] Photometrics & Optics (Spherical Harmonics / Corneal)
- [ ] Video Processing & Tracking (`backend/pipeline/video_processor.py`)
- [ ] REST API & Telemetry (`backend/main.py`)
- [ ] Interactive Frontend Console (`frontend/src/`)
- [ ] PDF Reporting Engine (`backend/pipeline/pdf_reporter.py`)
- [ ] Documentation / Benchmarks

### Verification & Testing
- [ ] `npm run build` executed in `frontend/` with 0 errors
- [ ] `python -m compileall backend/` executed with 0 syntax errors
- [ ] Tested on sample video / audio payloads
- [ ] Continuous anomaly calibration maintained ($\in [0.0, 1.0]$)
- [ ] Corresponding technical documentation updated in `backend/documentation/`
