# Technical Specification & Forensic Architecture: EXIF & Container Metadata Forensics (`metadata_analysis.py`)

**Implementation File**: [`backend/pipeline/metadata_analysis.py`](../pipeline/metadata_analysis.py)  
**Analytical Classification**: Container Forensics / EXIF & ISOBMFF Header Provenance / Software Fingerprinting  
**Upstream Dependencies**: `exifread`, `imageio_ffmpeg`, `subprocess`, `re`, `os`  
**Primary Interface**: `analyze_metadata(file_path)`  
**Meta-Classifier Vector Position**: Input Feature Index 7 (`metadata_score`)

---

## 1. Executive Summary & Forensic Metadata Theory

`metadata_analysis.py` parses and evaluates non-visual container metadata and exchangeable image file format (EXIF) structures for digital photographs and video containers.

In authentic photography, hardware camera sensors write detailed physical acquisition parameters into the file header at capture time: camera make, model, lens serial numbers, exposure time, aperture, ISO speed ratings, and calibrated hardware timestamps. Conversely, generative AI synthesis engines (Midjourney, DALL-E, Stable Diffusion, ComfyUI, Runway) and deepfake compositing tools (DeepFaceLab, FaceSwap, Roop) operate in software without physical camera hardware. They either:
1. **Strip All Metadata**: Produce completely clean binary headers devoid of camera or lens tags (`is_stripped = True`).
2. **Embed Generative Signatures**: Leave explicit tool identifiers in software strings (e.g. `Software: Stable Diffusion`, `encoder: Lavf58.76.100`).
3. **Imprint Epoch-Zero Timestamps**: Output default placeholder dates (e.g. `0000:00:00 00:00:00` or Unix epoch `1970-01-01`).

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           METADATA FORENSIC PARSING TOPOLOGY                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                     [Input Media File]
                                             │
                             Inspect File Extension (.ext)
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
          [Still Imagery: exifread]                       [Video: FFmpeg Engine]
          .jpg, .jpeg, .png, .tiff, .webp                 .mp4, .avi, .mov, .mkv
                     │                                               │
          Extract EXIF Binary Tags                        Parse Container Metadata Block
                     │                                               │
          ┌──────────┴──────────┐                         ┌──────────┴──────────┐
          ▼                     ▼                         ▼                     ▼
     [Empty Tags]         [Populated]                [Empty Tags]         [Populated]
     is_stripped = True   Check Software Strings     is_stripped = True   Check Encoder Strings
     Score += 0.40        Check Timestamps (0000/1970) Score += 0.30     Check creation_time
                          Camera Hardware Attributes
                                │                                               │
                                └───────────────────────┬───────────────────────┘
                                                        │
                                          Deterministic Anomaly Scoring
                                        metadata_anomaly_score ∈ [0.0, 1.0]
```

---

## 2. Image Metadata Pipeline: `exifread`

### 2.1 File Extension Handling
Targets still photographic media formats:
```python
ext in ['.jpg', '.jpeg', '.png', '.tiff', '.webp']
```

### 2.2 Extraction & Thumbnail Filtering
Opens the binary stream (`open(file_path, 'rb')`) and parses EXIF tags via `exifread.process_file(f, details=False)`:
* **Suppressed Tags**: Excludes heavy binary thumbnail and proprietary manufacturer byte arrays to maintain rapid execution:
  $$\text{Excluded} = \{\text{'JPEGThumbnail'}, \text{'TIFFThumbnail'}, \text{'Filename'}, \text{'EXIF MakerNote'}\}$$

### 2.3 Stripped Header Detection:
When `len(tags) == 0`:
```python
results["is_stripped"] = True
results["warnings"].append("No EXIF metadata found. Generative AI or social media platforms often strip EXIF data.")
results["metadata_anomaly_score"] += 0.4
```
* *Forensic Rationale*: Physical cameras never produce raw captures with zero EXIF tags. An empty header indicates either an AI-generated image or social media re-compression.

### 2.4 Software Signature Matching
Scans tags containing `"Software"` or `"ProcessingSoftware"` against a curated database of generative AI and image manipulation software:

```python
suspicious_software = [
    "adobe", "photoshop", "midjourney", "dall-e", 
    "stable diffusion", "gimp", "lightroom", "runway", "comfyui"
]
```

* **Definitive Generative AI Signature**:
  If the software string contains `midjourney`, `dall-e`, `stable diffusion`, `runway`, or `comfyui`:
  $$\text{metadata\_anomaly\_score} = 0.95$$
  *(Direct confirmation of synthetic generative origin).*
* **Editing Software Signature**:
  If the software string contains `adobe`, `photoshop`, `gimp`, or `lightroom`:
  $$\text{metadata\_anomaly\_score} = \max(\text{score}, 0.60)$$
  *(Indicates post-capture digital modification).*

### 2.5 Timestamp Validation
Examines the `Image DateTime` tag:
```python
if dt.startswith("0000:") or "1970" in dt:
    results["warnings"].append(f"Suspicious timestamp: {dt}")
    results["metadata_anomaly_score"] = max(results["metadata_anomaly_score"], 0.5)
```
* Detects uninitialized hardware clock states and Unix epoch defaults common in automated synthetic generation pipelines.

### 2.6 Camera Provenance Harvesting
Extracts authentic acquisition tags for forensic documentation:
$$\text{Harvested} = \{\text{'Make'}, \text{'Model'}, \text{'DateTime'}, \text{'ColorSpace'}, \text{'ImageWidth'}, \text{'ImageLength'}, \text{'LensModel'}\}$$

---

## 3. Video Container Pipeline: Headless FFmpeg

### 3.1 File Extension Handling
Targets multimedia container formats:
```python
ext in ['.mp4', '.avi', '.mov', '.mkv']
```

### 3.2 Headless Subprocess Invocation
Resolves standalone FFmpeg binary via `imageio_ffmpeg.get_ffmpeg_exe()`:
```python
process = subprocess.run(
    [ffmpeg_path, "-i", file_path, "-hide_banner"],
    capture_output=True,
    text=True,
    creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
)
```
* **Security & Performance**:
  * `-hide_banner`: Suppresses compiler version text.
  * `creationflags=subprocess.CREATE_NO_WINDOW`: Suppresses console window popup flashes on Windows operating systems.
  * Captures `process.stderr` (where FFmpeg streams header tree metadata).

### 3.3 Container Stream Parsing
Extracts the top-level container metadata dictionary:
1. Tracks state inside the `Metadata:` block.
2. Splits key-value pairs along the first colon (`parts = line.split(":", 1)`).
3. Evaluates encoder tags (`encoder`, `software`, `tool`):
   * Scans for generative keywords + `["lavf", "ffmpeg"]`:
     ```python
     if sus in val_lower:
         results["warnings"].append(f"Suspicious video encoder/software found: {val}")
         results["metadata_anomaly_score"] = max(results["metadata_anomaly_score"], 0.7)
     ```
   * *Forensic Rationale*: Commercial video cameras (Sony, Canon, iPhone, RED) encode using proprietary hardware encoders. Open-source FFmpeg / Libavformat (`Lavf`) tags indicate programmatic export from a Python script or generative pipeline.
4. Evaluates `creation_time`:
   If the timestamp starts with `"0000"` or contains `"1970"`, raises anomaly score to $0.60$.
5. When `len(extracted_tags) == 0`:
   Flags `is_stripped = True` and increments score by $+0.30$.

---

## 4. Anomaly Scoring Decision Matrix

The scoring logic operates as a deterministic rules engine:

| Observed Condition | Media Type | Anomaly Score ($\Delta S$) | Forensic Assessment |
| :--- | :---: | :---: | :--- |
| **Generative AI Tag Present** | Image | `0.95` (Absolute) | Direct proof of synthetic generation (Midjourney/Stable Diffusion/ComfyUI) |
| **Video Software / Lavf Encoder**| Video | `0.70` (Max) | Programmatic re-encoding via FFmpeg/Python script |
| **Editing Suite Tag Present** | Image | `0.60` (Max) | Digital post-processing via Photoshop/GIMP/Lightroom |
| **Suspicious Timestamp** | Both | `0.50 - 0.60` (Max) | Epoch-zero (`1970`) or uninitialized clock (`0000`) |
| **Completely Stripped EXIF** | Image | `+0.40` (Additive) | Header sanitized; common in AI exports & social media |
| **Completely Stripped Video** | Video | `+0.30` (Additive) | Missing container metadata track |
| **Clean Camera EXIF** | Image | `0.00` | Intact hardware camera make, model, lens metadata |

---

## 5. Interface Specification & Schema

### Function Signature
```python
def analyze_metadata(file_path: str) -> dict
```

### Parameters:
* **`file_path`** (`str`): File system path to the image or video media.

### Return Payload (Clean Camera Capture):
```json
{
  "metadata_anomaly_score": 0.0,
  "extracted_tags": {
    "Image Make": "Canon",
    "Image Model": "Canon EOS R5",
    "Image DateTime": "2024:05:14 14:22:08",
    "EXIF LensModel": "RF24-70mm F2.8 L IS USM",
    "EXIF ColorSpace": "sRGB"
  },
  "warnings": [],
  "is_stripped": false
}
```

### Return Payload (Generative Deepfake Capture):
```json
{
  "metadata_anomaly_score": 0.95,
  "extracted_tags": {
    "Image Software": "ComfyUI_windows_portable",
    "Image DateTime": "1970:01:01 00:00:00"
  },
  "warnings": [
    "Manipulation software signature found: ComfyUI_windows_portable",
    "Suspicious timestamp: 1970:01:01 00:00:00"
  ],
  "is_stripped": false
}
```

---

## 6. Meta-Classifier Integration & Anti-Shortcut Safeguards

* **Ensemble Position**: `metadata_anomaly_score` feeds as **Input Feature Index 7** (`metadata_score`) into `ensemble_classifier.py`.
* **The "Shortcut Learning" Safeguard**:
  * In `ensemble_classifier.py` line 125 and line 175:
    ```python
    # Randomize metadata_score (7) to prevent it from becoming a shortcut
    features[7] = np.random.uniform(0.0, 1.0)
    ```
  * **Critical Machine Learning Justification**: Real-world social media platforms (WhatsApp, X/Twitter, Instagram, TikTok) automatically strip EXIF data and re-encode video containers using FFmpeg/Lavf to save bandwidth. If the meta-classifier was allowed to train on metadata as a dominant feature, it would learn a spurious shortcut (`IF stripped THEN fake`), causing massive false positives on authentic social media media!
  * By randomizing metadata during training, the neural network learns to rely strictly on physical, optical, and biological signals, while metadata serves as an explicit deterministic diagnostic for human forensic analysts.
