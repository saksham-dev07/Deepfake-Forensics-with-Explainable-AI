# Technical Specification & Data Ingestion Architecture: Video Preprocessor & Scene-Aware Frame Extractor (`video_processor.py`)

**Implementation File**: [`backend/pipeline/video_processor.py`](../pipeline/video_processor.py)  
**Analytical Classification**: Media Ingestion / Video Transcoding / Scene-Aware Temporal Sampling / Acoustic Demuxing  
**Framing Algorithms**: PySceneDetect (`ContentDetector`, Threshold 27.0) / FFmpeg Hardware-Accelerated `select` Filter  
**Audio Standards**: 16 kHz Mono PCM 16-Bit Little-Endian (`pcm_s16le`, 16000 Hz, 1 Channel)  
**Upstream Dependencies**: `OpenCV (cv2)`, `imageio_ffmpeg`, `subprocess`, `scenedetect`, `os`  
**Primary Interface**: `process_video(video_path: str, job_id: str) -> (str, str | None)`  

---

## 1. Executive Summary & Ingestion Architecture

`video_processor.py` serves as the primary media ingestion, normalization, and transcoding gateway for the DeepForensics platform.

In automated forensic pipelines, raw user uploads arrive in heterogeneous formats (variable bitrates, high-resolution 4K/8K encodings, proprietary container structures, variable frame rates, stereo/surround audio). Feeding unprocessed raw streams directly into deep learning networks and pixel-level forensic filters causes extreme GPU memory fragmentation, non-deterministic latency, and audio-visual feature dimension mismatches.

`video_processor.py` enforces rigid structural standardization:
1. **Duration Capping**: Restricts video analysis to the initial 60 seconds (`MAX_DURATION_SEC = 60`), mitigating compute exhaustion denial-of-service vulnerabilities.
2. **Acoustic Transcoding**: Extracts and converts the audio track into a pristine 16 kHz mono 16-bit PCM WAV stream formatted specifically for Lip-Sync (`SyncNetModel.py`) and Voice Anti-Spoofing (`voice_spoofing.py`).
3. **Scene-Aware Keyframe Sampling**: Rather than naively extracting adjacent frames, the module uses **PySceneDetect** to identify camera cuts and distributes up to 16 keyframes uniformly across all distinct scenes.
4. **High-Throughput FFmpeg Filter Pipelines**: Utilizes headless, non-blocking FFmpeg subprocess calls with the `select` video filter and low quantization loss (`-q:v 2`), dropping extraction time from seconds to milliseconds.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           VIDEO PREPROCESSOR DATA FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                     [Input Media File]
                                             │
                              Format Inspection (.ext)
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
          [Still Image (.jpg, .png)]                      [Video File (.mp4, .mov, ...)]
          Direct OpenCV Read                              Probe FPS & Total Frames
          Save frame_0000.jpg                             Clamp to 60s (MAX_DURATION_SEC)
          Return (frames_dir, None)                                  │
                     │                               ┌───────────────┴───────────────┐
                     │                               ▼                               ▼
                     │                   [Audio Extraction: FFmpeg]       [Scene Detection: PySceneDetect]
                     │                   -vn (Strip Video)                ContentDetector(threshold=27.0)
                     │                   -acodec pcm_s16le                Detect Camera Cuts & Transitions
                     │                   -ar 16000 (16 kHz)                          │
                     │                   -ac 1 (Mono)                                ▼
                     │                               │                    Adaptive Scene-Wise Sampling
                     │                               ▼                    Calculate 16 Frame Indices
                     │                        uploads/{job}.wav                      │
                     │                                                               ▼
                     │                                                    [Frame Extraction: FFmpeg]
                     │                                                    -vf select='eq(n\,X)+eq(n\,Y)...'
                     │                                                    -vsync 0 -q:v 2 (High Quality)
                     │                                                    (OpenCV POS_FRAMES Fallback)
                     │                                                               │
                     │                                                               ▼
                     │                                                    uploads/{job}_frames/frame_XXXX.jpg
                     │                                                               │
                     └───────────────────────────────┬───────────────────────────────┘
                                                     │
                                                     ▼
                                       (frames_dir, audio_path)
```

---

## 2. Audio Demuxing & Normalization Pipeline

Downstream speech forensics models (`SyncNetModel.py`, `audio_sync.py`, and `voice_spoofing.py`) require audio normalized to single-channel 16 kHz uncompressed PCM.

```python
subprocess.run(
    [
        ffmpeg_exe, '-y', 
        '-i', video_path, 
        '-t', str(MAX_DURATION_SEC), 
        '-vn', 
        '-acodec', 'pcm_s16le', 
        '-ar', '16000', 
        '-ac', '1', 
        audio_path
    ],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    check=True
)
```

### 2.1 FFmpeg Parameter Specification:
* **`-y`**: Overwrite output file if it already exists from a prior task.
* **`-t 60`**: Enforces strict 60-second temporal clamping at the container demuxer level.
* **`-vn`**: Disables video recording; instructs FFmpeg to skip decoding video packets entirely, maximizing demuxing speed.
* **`-acodec pcm_s16le`**: Uncompressed 16-bit Little-Endian Linear Pulse Code Modulation, avoiding lossy re-encoding artifacts.
* **`-ar 16000`**: Resamples audio to $16,000\text{ Hz}$ (the exact sampling rate expected by MFCC extractors).
* **`-ac 1`**: Downmixes multi-channel audio to a single mono track, eliminating spatial phase interference.

### 2.2 Silent Video Exception Handling:
If the video lacks an audio track, FFmpeg returns a non-zero exit code. The function catches this exception safely, verifies file size, and sets `audio_path = None`, allowing downstream video-only modules to continue execution without interruption.

---

## 3. Scene-Aware Keyframe Sampling: `PySceneDetect`

Uniform frame extraction across an entire video often samples redundant frames from the same static scene or completely misses brief, critical spliced cuts. To solve this, the module implements content-aware scene detection:

```python
from scenedetect import detect, ContentDetector
scene_list = detect(video_path, ContentDetector(threshold=27.0))
```

### 3.1 ContentDetector Algorithm
`ContentDetector` computes the frame-to-frame delta in HSV color space:
1. Transforms adjacent frames to HSV: $I_t(x, y) \rightarrow (H, S, V)$.
2. Computes the 8-bit absolute difference in Hue, Saturation, and Value components:
   $$\Delta_{\text{content}}(t) = \frac{1}{WH}\sum_{x, y} \left( |\Delta H| + |\Delta S| + |\Delta V| \right)$$
3. If $\Delta_{\text{content}}(t) > 27.0$, a structural camera cut is registered at frame $t$.

### 3.2 Dynamic Scene-Wise Frame Allocation:
For a video partitioned into $K$ detected scenes:
$$\text{frames\_per\_scene} = \max\left(1, \left\lfloor \frac{16}{K} \right\rfloor\right)$$

Within each scene interval $[F_{\text{start}}, F_{\text{end}}]$:
$$\text{step} = \max\left(1, \left\lfloor \frac{F_{\text{end}} - F_{\text{start}}}{\text{frames\_per\_scene} + 1} \right\rfloor\right)$$
$$\text{frame\_indices} \leftarrow F_{\text{start}} + (i \cdot \text{step}) \quad \text{for } i \in [1, \text{frames\_per\_scene}]$$

* **Underfill Compensation**: If scene boundaries yield fewer than 16 frames, the deficit is filled via uniform global interpolation:
  $$\text{uniform\_indices} = \left\lfloor i \cdot \frac{F_{\text{total}}}{\text{needed}} \right\rfloor$$
* **Import Fallback**: If `scenedetect` is not installed, gracefully defaults to uniform 16-frame slicing:
  $$\text{frame\_indices} = \left\lfloor i \cdot \frac{F_{\text{total}}}{16} \right\rfloor \quad \text{for } i \in [0, 15]$$

---

## 4. Accelerated Frame Extraction: FFmpeg `select` Filter

Rather than seeking and decoding frames sequentially in Python loops (which incurs massive decompression overhead), the module compiles the target frame indices into a single native FFmpeg video filter expression:

```python
select_expr = '+'.join([rf"eq(n\,{idx})" for idx in frame_indices])
output_pattern = os.path.join(frames_dir, "frame_%04d.jpg")

subprocess.run(
    [
        ffmpeg_exe, '-y', 
        '-i', video_path, 
        '-vf', f"select={select_expr}", 
        '-vsync', '0', 
        '-q:v', '2', 
        output_pattern
    ],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    check=True
)
```

### 4.1 Technical Parameters:
* **`select=eq(n\,X)+eq(n\,Y)+...`**: The filter evaluates frame number `n`. Only frames where the boolean sum evaluates to true ($>0$) are passed to the output muxer. Notice the escaped comma (`\,`), required by FFmpeg CLI grammar.
* **`-vsync 0`**: Disables timestamp synchronization, preventing FFmpeg from inserting duplicate frames to maintain constant frame rate.
* **`-q:v 2`**: High-quality JPEG quantization scale ($1-31$, where $2$ preserves microscopic high-frequency sensor noise and compression residuals essential for PRNU and ELA analysis).

### 4.2 OpenCV POS_FRAMES Fallback
If FFmpeg execution encounters corrupted streams or filter syntax errors, the module falls back to OpenCV seeking:
```python
cap = cv2.VideoCapture(video_path)
for idx in frame_indices:
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(frame_path, frame)
cap.release()
```

---

## 5. Interface Specification & Schema

### Function Signature
```python
def process_video(
    video_path: str,
    job_id: str
) -> tuple[str, str | None]
```

### Parameters:
* **`video_path`** (`str`): Filesystem path to the incoming image or video file.
* **`job_id`** (`str`): Unique job identifier (e.g. UUID string) used to isolate temporary file artifacts.

### Return Tuple:
1. **`frames_dir`** (`str`): Path to the directory containing extracted high-resolution JPEG frames:
   `"uploads/{job_id}_frames/frame_0000.jpg" ... "frame_0015.jpg"`
2. **`audio_path`** (`str | None`): Path to the extracted 16 kHz mono WAV audio file:
   `"uploads/{job_id}.wav"` (or `None` if media is an image or silent video).

---

## 6. System Integration & Error Handling

* **Upstream Consumer**: Called at the beginning of the analysis pipeline in `main.py` before delegating to individual forensic workers.
* **Zero-Frame Guard**: Raises `ValueError("Video has no frames or could not be read.")` if `total_frames == 0` or `fps == 0`.
* **Corrupted Image Guard**: Raises `ValueError("Could not read image file.")` if `cv2.imread` fails on static image files.
