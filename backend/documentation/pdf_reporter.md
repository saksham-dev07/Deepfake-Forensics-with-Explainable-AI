# Technical Specification & Document Architecture: Automated Forensic PDF Reporting Engine (`pdf_reporter.py`)

**Implementation File**: [`backend/pipeline/pdf_reporter.py`](../pipeline/pdf_reporter.py)  
**Analytical Classification**: Automated Document Synthesis / Evidentiary Forensics / Multi-Modal Data Aggregation  
**Rendering Engine**: `fpdf2 (FPDF)` / `OpenCV (cv2)`  
**Document Format**: ISO 216 A4 ($210\text{ mm} \times 297\text{ mm}$), Vector Geometry & Typography  
**Primary Interface**: `generate_pdf_report(result_data: dict, output_path: str) -> str`  

---

## 1. Executive Summary & Document Architecture

`pdf_reporter.py` compiles the analytical findings of all 15 multimodal forensic sub-engines, Explainable AI (SHAP) feature attributions, and visual evidence plots into an official, courtroom-ready PDF document.

In digital forensics and legal proceedings, algorithmic raw JSON payloads are insufficient; forensic examiners, legal counsel, and judges require a standardized, tamper-evident audit report containing:
1. **Executive Verdict & Case Metadata**: Case ID, timestamp, analyzed frames, and binary high-visibility verdict banner.
2. **Tabular Sensor Breakdown**: Continuous confidence scores across all 15 algorithmic detection vectors with integrated visual gauge bars.
3. **Deep Scientific Metric Audits**: Sub-engine numerical parameters (e.g. DWT diagonal variance, Cepstrum echoes, rPPG SNR, CFA demosaicing residuals).
4. **Visual Evidence Gallery**: A 2-column auto-paginated grid embedding up to 30+ visual forensic exhibits (heatmaps, spectra, radar charts, waveforms).
5. **Evidentiary Disclaimer**: Formal legal disclaimers regarding automated AI evidentiary admissibility.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PDF REPORT ENGINE DATA FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                [Multimodal Result Dictionary]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
          [Text Sanitization Pipeline]                    [ForensicPDF Subclass]
          Replaces Typographic Unicode                    A4 Format (210×297mm)
          Maps Characters to Latin-1 Safe                 Institutional Color Palette
                      │                                   Header / Footer Callbacks
                      └───────────────────────┬───────────────────────┘
                                              │
                                   [Document Generation]
                                              │
         ├── COVER PAGE: Title Banner, Metadata, Executive Verdict, SHAP Factors
         ├── CHAPTER 1: AI Meta-Classifier Sensor Breakdown & Visual Confidence Gauge
         ├── CHAPTER 2: Frequency Domain (FFT, DCT, DWT, SWN) & ELA Compression
         ├── CHAPTER 3: Biological Geometry, Eye Aspect Ratio & Optical Flow Jitter
         ├── CHAPTER 4: Sensor Noise (PRNU Variance) & Multi-Space Chrominance
         ├── CHAPTER 5: Physical Optics (3D Lighting, CFA, Corneal Reflections)
         ├── CHAPTER 6: Audio Forensics (SyncNet, Voice Spoofing) & rPPG Pulse
         ├── CHAPTER 7: Container Metadata & EXIF Integrity
         ├── CHAPTER 8: Visual Evidence Gallery (2-Column Auto-Paginated Grid)
         └── LEGAL DISCLAIMER: Evidentiary Admissibility Notice
                                              │
                                              ▼
                                   [Output PDF File (.pdf)]
```

---

## 2. Text Sanitization & Character Encoding Architecture

The `fpdf` library strictly adheres to the ISO 8859-1 (Latin-1) character set. Standard Unicode symbols (smart quotes, em-dashes, arrows, mathematical glyphs) produce fatal encoding exceptions if unhandled.

```python
def sanitize_text(text):
    text = str(text)
    replacements = {
        '\u2014': '-', '\u2013': '-', '\u2018': "'", '\u2019': "'",
        '\u201c': '"', '\u201d': '"', '\u2026': '...', '\u00d7': 'x',
        '\u2713': 'Yes', '\u2717': 'No', '\u2192': '->', '\u2190': '<-'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text.encode('latin-1', errors='replace').decode('latin-1')
```

* **Targeted Replacements**: Replaces common typographic characters with ASCII equivalents prior to rendering.
* **Lossy Fallback**: Appends `.encode('latin-1', errors='replace').decode('latin-1')`, converting unmapped characters to `?` rather than terminating execution.

---

## 3. Typographic & Visual Style Guide: `ForensicPDF`

The document design enforces an institutional aesthetic using a curated color palette:

| Design Token | RGB Value | Hex Equivalent | Usage |
| :--- | :---: | :---: | :--- |
| **`brand_color`** | `(26, 43, 76)` | `#1a2b4c` | Primary titles, cover header, table borders, exhibit titles |
| **`accent_color`**| `(66, 133, 244)` | `#4285f4` | Secondary headings and link indicators |
| **`gray_bg`** | `(245, 247, 250)` | `#f5f7fa` | Alternating table rows, chapter header fill |
| **`gray_text`** | `(100, 100, 100)` | `#646464` | Subtitles, footer text, metadata labels |
| **`danger_color`**| `(220, 38, 38)` | `#dc2626` | Deepfake verdict banner, anomalous factors, gauge fill |
| **`success_color`**| `(22, 163, 74)` | `#16a34a` | Authentic verdict banner, pass factors, gauge fill |

### 3.1 Header & Footer Callbacks
* **`header()`**:
  * Suppressed on Page 1 (`if self.page_no() == 1: return`).
  * On Page 2+: Renders an $8\text{ mm}$ high navy blue banner across the top margin ($Y \in [0, 8]$) with white bold text: `"DEEPFORENSICS | CONFIDENTIAL ANALYSIS REPORT"`.
* **`footer()`**:
  * Suppressed on Page 1.
  * On Page 2+: Renders a $0.2\text{ mm}$ light gray dividing rule ($X \in [10, 200]$) followed by centered italic pagination: `"Page X | Generated by DeepForensics AI Meta-Classifier"`.

### 3.2 Dynamic Chapter Titles & Table Rows
* **`chapter_title(num, title)`**:
  * Renders a full-width shaded bar (`gray_bg`) with a $0.5\text{ mm}$ left border rule (`brand_color`) and bold 14pt font.
* **`draw_table_row(col1, col2, bg_color, bold)`**:
  * Evaluates text length using `self.get_string_width(col2_str)`.
  * If short ($< 70\text{ mm}$): Renders standard single-row layout ($120\text{ mm}$ left label, remaining width right-aligned).
  * If long ($\ge 70\text{ mm}$): Expands into a stacked multi-cell block to prevent text truncation or column overlap.

---

## 4. Document Section Breakdown

### 4.1 Cover Page
1. **Title Header**: Solid navy rectangle ($210 \times 40\text{ mm}$) with centered 24pt white bold title.
2. **Metadata Table**: Case ID / Job (first 8 hex characters of UUID), Analysis Date (UTC), Target File Type, and Frames Analyzed.
3. **Executive Verdict Banner**:
   * Sized at $190 \times 35\text{ mm}$.
   * Dynamic color: Crimson Red (`danger_color`) if `"FAKE"` or $\text{score} > 0.50$, else Emerald Green (`success_color`).
   * Large 28pt bold typography: `"DEEPFAKE / MANIPULATED"` or `"AUTHENTIC / UNALTERED"`.
4. **Key Anomaly Factors (Explainable AI)**:
   * Extracted from SHAP top feature attributions (`shap_top_features[:4]`).
   * Prefixed with a red warning glyph (`!`) with highlighted parenthetical verdicts `(FAKE)` or `(AUTHENTIC)`.

### 4.2 Chapter 1: AI Meta-Classifier Sensor Breakdown
Aggregates all 15 detection vector confidences into a single consolidated table:
* Neural Network (EfficientNet-B4)
* Frequency Domain Anomaly
* Error Level Analysis (ELA)
* Biological Geometry Anomaly
* Sensor Noise Fingerprint (PRNU)
* Chrominance Color Space Anomaly
* Audio-Visual Desynchronization (SyncNet)
* Eye & Gaze Anomaly
* Voice Spoofing Analysis
* Temporal Optical Flow Jitter
* Metadata & EXIF Integrity
* 3D Lighting Consistency
* CFA Artifacts Analysis
* Corneal Reflection Consistency
* Remote Photoplethysmography (rPPG)

#### Visual Confidence Gauge:
Directly below the final score, the engine draws a vector progress bar:
* Gray track: `pdf.rect(10, Y, 190, 4, 'F')`
* Filled bar: `pdf.rect(10, Y, max(190 * score, 2), 4, 'F')` colored by verdict.

### 4.3 Chapters 2 Through 7: In-Depth Scientific Audits
* **Chapter 2 (Frequency & Compression)**: Displays exact sub-band metrics (HF ratio, DCT diagonal ratio, cross-channel variance, PCA PC3 ratio, SWN anomaly ratio, HPF variance, Cepstrum variance, DWT diagonal variance, and ELA smooth region anomaly).
* **Chapter 3 (Biological & Facial Geometry)**: Displays Golden Ratio ($\phi \approx 1.618$), Interocular Proportion ($1.30$), Facial Symmetry Deviation, Blink Rate (BPM), Gaze Asymmetry, and Optical Flow Motion Variance.
* **Chapter 4 (Sensor Noise & Color Space)**: Displays PRNU variance and color space variances ($C_b, C_r$, Saturation, LAB $a^*$).
* **Chapter 5 (Physical Optics)**: Lighting divergence angle, CFA demosaicing residuals, and corneal reflection consistency.
* **Chapter 6 (Audio & Physiology)**: Mouth-Audio Pearson correlation, LSE-C, LSE-D, Voice Zero-Crossing Variance, and rPPG Signal-to-Noise Ratio (dB) with estimated BPM.
* **Chapter 7 (Metadata & EXIF)**: Tag absence counters and software signature strings.

---

## 5. Visual Evidence Gallery Engine: 2-Column Grid

Chapter 8 implements an auto-paginated 2-column image layout:

### 5.1 Geometry & Placement Mathematics:
* **Target Width**: $W_{\text{target}} = 90\text{ mm}$.
* **Aspect Ratio Preservation**:
  $$H_{\text{target}} = W_{\text{target}} \times \left(\frac{H_{\text{orig}}}{W_{\text{orig}}}\right)$$
* **Horizontal Positioning**:
  * Column 0 (Left): $X = 10\text{ mm}$
  * Column 1 (Right): $X = 110\text{ mm}$
* **Auto-Pagination Boundary**:
  If $Y + H_{\text{target}} + 20 > 270\text{ mm}$, executes `pdf.add_page()` and resets $Y$ to the top margin.
* **Bounding Border**: Draws a subtle light-gray bounding rectangle ($X-1, Y-1, W+2, H+2$) around every image exhibit.
* **Exhibit Numbering**: Increments an automated counter (`EXHIBIT 1`, `EXHIBIT 2`, ...) centered beneath each image in navy 8pt bold font.

### 5.2 Gallery Subsections & Supported Exhibits:

| Gallery Group | Exhibits Included |
| :--- | :--- |
| **Neural Attention & ELA** | Grad-CAM Heatmap, High-Resolution Guided Grad-CAM, ELA Heatmap, Base ELA Map, JPEG Ghosting, HSV Color ELA |
| **Frequency Domain** | FFT Magnitude Spectrum, DCT Spectrum, Block DCT Artifacts, High-Pass Filter, SWN Noise Map, Phase Spectrum, Spectral Saliency, PCA Component, Cepstrum, DWT Wavelet |
| **Facial Geometry & Texture**| Geometry Radar Chart, Landmark Mapping, 3D Head Pose, Facial Symmetry Map, Temporal Jitter Plot, Texture Anomaly |
| **Noise & Chrominance** | NLM Denoised Base, PRNU Noise Residual, SRM Filter Map, $C_b$ Map, $C_r$ Map, Saturation Map, LAB $a^*$ Map |
| **Temporal, Audio & Motion**| Audio-Visual Sync Plot, EAR Blink Tracker, Voice Mel-Spectrogram, Optical Flow Plot, Optical Flow HSV Field |
| **Advanced Modalities** | 3D Lighting Consistency Map, CFA Map, Corneal Reflection Overlay, rPPG Heartbeat Waveform, rPPG ROI Heatmap |

---

## 6. Evidentiary Disclaimer Specification

The report concludes with a framed legal advisory:
* Border: $190 \times 25\text{ mm}$ rectangle with danger red outline (`pdf.rect(10, Y, 190, 25, 'FD')`) and soft pink tint (`(250, 240, 240)`).
* Advisory Notice: Stating that results are generated by an automated AI meta-classifier and require expert review by a qualified forensic analyst before formal legal submission.

---

## 7. Interface Specification & Schema

### Function Signature
```python
def generate_pdf_report(
    result_data: dict,
    output_path: str
) -> str
```

### Parameters:
* **`result_data`** (`dict`): The comprehensive multimodal analysis payload returned by the main forensic coordinator.
* **`output_path`** (`str`): Target filesystem path where the generated `.pdf` document will be written.

### Return Value:
* Returns the verified absolute or relative path to the generated PDF document.
