# Audio-visual synchronization and SyncNet v2

**Implementations:** `backend/pipeline/audio_sync.py`, `backend/pipeline/SyncNetModel.py`  
**Interface:** `analyze_audio_visual_sync(video_path, audio_path, output_dir, prefix="sync")`  
**Checkpoint:** `backend/weights/syncnet_v2.model`  
**Dependencies:** OpenCV, MediaPipe, NumPy, SciPy, librosa, PyTorch, Matplotlib.

## Method and research correspondence

The [Chung and Zisserman paper](https://www.robots.ox.ac.uk/~vgg/publications/2016/Chung16a/chung16a.pdf), Sections 2–4, learns audiovisual correspondence with contrastive distance and searches temporal offsets. It does not establish that audiovisual misalignment proves a deepfake. The original paper describes grayscale/256-dimensional features; this project uses the author's later [SyncNet v2 architecture](https://github.com/joonson/syncnet_python/blob/master/SyncNetModel.py) with BGR/1024-dimensional features.

The [official evaluator](https://github.com/joonson/syncnet_python/blob/master/SyncNetInstance.py) is the checkpoint input reference. Audio uses 16 kHz PCM-scale samples and 13 MFCCs at 100 Hz; video uses five 224×224 BGR frames at 25 Hz, without division by 255. The installed NumPy/SciPy implementation matches the [reference MFCC implementation](https://github.com/jameslyons/python_speech_features/blob/master/python_speech_features/base.py): preemphasis .97, rectangular 25 ms frames, 10 ms hops, 512-point power FFT, 26 mel filters, DCT-II, 13 coefficients, lifter22, log-energy coefficient zero. A golden-vector regression protects this contract.

```text
video → fixed 25 Hz samples → padded face context → 5-frame BGR windows → visual embedding
16 kHz audio → PCM-scale MFCC → 13×20 windows → audio embedding
observed windows → aligned distances + common-support offset search → measurements
```

## Geometry and temporal support

Crop bounds derive from MediaPipe landmarks, then use the official pipeline's crop-scale .40 context: relative to face center `(cx,cy)` and half-size `s`, x spans `cx±1.4s`, y spans `cy-s` through `cy+1.8s`. Border padding is110, preserving square geometry. Unlike the reference pipeline, this implementation does not have S3FD face tracks, shot boundaries, or median-smoothed boxes. Consequently the outputs are not interchangeable with published benchmark measurements.

Processing is limited to the first15 seconds. Missing mouth observations remain gaps on the original timeline. All audio embeddings and observed video embeddings are computed in batches of at most8. Invalid FPS is unavailable rather than silently assumed25. Invalid and extreme crop boxes are rejected.

Let `I` contain observed video-window indices for which all audio shifts `k∈[-10,10]` exist. At least10 common windows are required:

$$D(k)=\frac1{|I|}\sum_{i\in I}\|v_i-a_{i+k}\|_2.$$

`lse_d=min(D)`, `lse_c=median(D)-min(D)`. The reported offset is `-argmin_shift` frames (40 ms/frame), following the evaluator's sign convention. Boundary windows are excluded at every shift rather than padded with invented zero embeddings. A flat curve has no identifiable offset; its offset is null. An optimum at ±400 ms raises a boundary warning. `aligned_distance` uses all observed aligned pairs and is deliberately distinct from minimum offset distance. Pearson `correlation` is null: LSE-C is not a correlation coefficient.

## Interface and interpretation

Every result contains `sync_score=.5`, `available`, `score_available=false`, `eligible_for_fusion=false`, `score_calibrated=false`, `speech_verified=false`, `lse_d`, `lse_c`, `correlation=null`, `warnings`. Missing inputs add `error`; insufficient evidence leaves `available=false`. Successful measurements add `aligned_distance`, `observed_windows`, `sync_plot_path`, and `explanation`. Successful offset search also adds `offset_frames`, `offset_ms`, `offset_search_frames=10`, and `offset_support_windows`.

The neutral compatibility score is not a measured probability. Former hand-selected distance-to-fake thresholds and causal deepfake explanations were removed. Dubbing, broadcast delays, silence, non-speech, static faces, multiple speakers, and crop mismatch can affect measurements. No speech or active-speaker verification is supplied; these measurements are excluded from combined classification until applicable labeled-video evaluation and calibration exist.

## Architecture and persistence guards

`S.forward_aud` accepts `[B,1,13,20]`; `forward_lip` and `forward_lipfeat` accept `[B,3,5,224,224]`. Shape errors raise before convolution. Layer names and parameter shapes remain checkpoint compatible. Model initialization publishes only a successfully loaded model under a lock and uses evaluation/inference modes. Non-finite distances remain unavailable. The plot shows observed aligned distances with no invented authenticity threshold, and uses `save_optimized_figure` from the existing image utilities.

## Validation still required

Measure offset recovery on controlled shifts of genuine speaking videos; include silence, voiceover, scene cuts, multiple people, variable frame rates, codecs and native low frame rates. Compare crops and offset curves against the official implementation on identical tracks. Only speaker-disjoint labeled speech/video calibration can justify an anomaly-score mapping; this review does not report new detection accuracy.
