# Contributing to Deepfake Forensics & Explainable AI Platform

Thank you for your interest in contributing to the **Deepfake Forensics & Explainable AI (XAI) Platform**! We welcome contributions from researchers, digital forensic examiners, machine learning engineers, and software developers.

---

## Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior in accordance with our reporting guidelines.

---

## How Can You Contribute?

1. **Adding New Forensic Detectors**: Implement new physical, biological, optical, or neural forensic modules into the parallel pool.
2. **Improving Model Weights**: Train or fine-tune detectors on emerging deepfake datasets (e.g., Sora, Gen-2, Midjourney v6, ElevenLabs v2).
3. **Enhancing Explainability (XAI)**: Improve feature attribution visualizations, SHAP summary plots, or Grad-CAM saliency rendering.
4. **Optimizing Latency & Throughput**: Vectorize NumPy operations, reduce GPU memory allocations, or optimize TensorRT/ONNX runtimes.
5. **Reporting False Positives / Edge Cases**: Submit detailed issue reports with reproducible artifacts when compression or lighting artifacts fool detectors.

---

## Developing & Submitting Changes

### 1. Fork & Clone
```bash
git clone https://github.com/<your-username>/deepfake-forensics-with-explainable-AI.git
cd deepfake-forensics-with-explainable-AI
```

### 2. Setting Up Environments
- **Backend (Python 3.10+)**:
  ```bash
  cd backend
  python -m venv venv
  # Activate venv (PowerShell on Windows: .\venv\Scripts\Activate.ps1, Linux: source venv/bin/activate)
  pip install -r requirements.txt
  ```
- **Frontend (Node.js 18+)**:
  ```bash
  cd frontend
  npm install
  ```

### 3. Guidelines for Adding a New Forensic Detector

Any new forensic detector added to `backend/pipeline/` must satisfy the following architectural criteria:
- **Continuous Calibration**: The output score must be a calibrated continuous anomaly float $\in [0.0, 1.0]$, where $0.0$ indicates authentic media and $1.0$ indicates synthetic manipulation.
- **Fail-Safe Fallbacks**: The module must handle corrupt frames, missing audio streams, or undetected faces gracefully without raising unhandled exceptions.
- **Explainability Hooks**: The detector should generate diagnostic data (e.g., visual heatmaps, frequency spectra, landmark overlays) suitable for forensic review.
- **Technical Specification**: A corresponding Markdown document detailing the mathematical derivation must be added to `backend/documentation/`.
- **Frontend Tab**: A dedicated analytical inspection component must be integrated into `frontend/src/components/tabs/`.

### 4. Code Quality & Formatting
- **Python**: Format code using `black` and `isort`.
  ```bash
  black backend/
  ```
- **JavaScript/React**: Ensure `npm run build` compiles with 0 errors.
  ```bash
  cd frontend
  npm run build
  ```

### 5. Pull Request Workflow
1. Create a feature branch (`git checkout -b feature/my-new-detector`).
2. Commit your changes with clear, descriptive commit messages (`git commit -m "feat(pipeline): add spatial wavelet demosaicing detector"`).
3. Push to your fork (`git push origin feature/my-new-detector`).
4. Open a Pull Request against the `main` branch using our [PR Template](.github/PULL_REQUEST_TEMPLATE.md).

---

## Questions and Support

Feel free to open a GitHub Discussion or submit an Issue if you have architectural questions or need guidance on implementing a new forensic method.
