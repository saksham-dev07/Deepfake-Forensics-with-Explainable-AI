export const TEST_DEFINITIONS = {
  features: {
    title: "Multi-Modal Ensemble (Tabular ResNet & SHAP)",
    what_is_it: "An 8-layer Tabular ResNet with 4-head Multi-Head Self-Attention trained on Class-Balanced Weighted Focal Loss (gamma=2.0, alpha=0.65).",
    what_it_does: "Aggregates the 15 continuous physical, spectral, biological, and deep learning anomaly scores into an empirical meta-verdict, with automated rule-based overrides for critical biological failures and SHAP KernelExplainer directional attributions.",
    how_good_is_it: "Extremely resilient against adversarial evasion because it evaluates independent physical, hardware, and biological failure modes simultaneously.",
    how_to_bypass: "Nearly impossible to bypass completely; requires defeating spatial, temporal, frequency, hardware sensor, and cardiovascular biological detectors in unison."
  },
  visual: {
    title: "GradCAM & Guided Grad-CAM Visual Attribution",
    what_is_it: "A dual-resolution Explainable AI (XAI) attribution pipeline hooking the final 1792-channel convolutional head of EfficientNet-B4 + CBAM.",
    what_it_does: "Coarse Grad-CAM highlights macroscopic facial zones driving the FAKE class, while Guided Grad-CAM applies 1st–99th percentile HDR dynamic range contrast stretching in scientific Inferno colormaps to expose microscopic warping seams and GAN checkerboard artifacts.",
    how_good_is_it: "Provides court-admissible visual evidence satisfying the Daubert legal standard by illustrating the exact pixel features driving the neural prediction.",
    how_to_bypass: "It is an interpretability attribution system; defeating it requires eliminating all spatial blending seams and upsampling artifacts in the generative model."
  },
  ela: {
    title: "Error Level Analysis (ELA)",
    what_is_it: "A compression physics test measuring high-frequency DCT quantization residuals against a standard Q=95 quality matrix.",
    what_it_does: "Resaves the image at a standard 95% JPEG quality factor and evaluates pixel-level difference maps, smooth region anomaly ratios, and HSV saturation variance. Composited faces compress at different error rates than camera backgrounds.",
    how_good_is_it: "Highly effective for detecting image splicing, copy-paste tampering, and re-encoded facial regions on high-quality photographs.",
    how_to_bypass: "Repeatedly recompressing the entire image at low quality or applying uniform noise across all regions suppresses ELA error disparities."
  },
  geometry: {
    title: "Facial 3D Geometry & Boundary Gradient Forensics",
    what_is_it: "A biometric test mapping 468 3D facial landmarks via MediaPipe, solving 3D head pose Euler angles, and evaluating boundary texture continuity.",
    what_it_does: "Solves 3D head pose Euler angles (Yaw, Pitch, Roll) via Perspective-n-Point (PnP), evaluates Sobel gradient energy ratios along the outer face boundary vs the interior, and tracks landmark temporal jitter.",
    how_good_is_it: "Robust against face-swap bounding box splices where generative networks produce soft blending seams along the jawline and forehead.",
    how_to_bypass: "Requires perfect pixel-level edge blending and 3D mesh alignment matching the anatomical skull morphology."
  },
  corneal: {
    title: "Corneal Specular Highlight Consistency",
    what_is_it: "An optical physics test inspecting specular corneal light reflections in human eyes, with false-positive suppression safeguards for low-resolution imagery.",
    what_it_does: "Converts ocular crops to CIELAB color space, thresholds top-10% lightness highlights, enforces convex hull containment, and measures Normalized Cross-Correlation (NCC), SSIM, and IoU between both eyes.",
    how_good_is_it: "Highly accurate for portrait imagery. Generative AI models synthesize eyes independently, rendering physically impossible mismatched reflections.",
    how_to_bypass: "Requires rendering physically consistent 3D environment ray-tracing or manually correcting corneal reflections in post-production."
  },
  cfa: {
    title: "Color Filter Array (CFA) Demosaicing Forensics",
    what_is_it: "Detection of hardware-level digital camera sensor interpolation grids using a 3x3 high-pass Bayer residual filter.",
    what_it_does: "Applies a 3x3 high-pass diagonal residual filter matrix with 8x8 block local variance pooling to isolate the periodic Bayer demosaicing pattern and detect missing camera sensor artifacts.",
    how_good_is_it: "Decisive for identifying fully AI-generated imagery (Midjourney, DALL-E, Stable Diffusion), which lacks physical hardware Bayer mosaic grids.",
    how_to_bypass: "Artificially simulating physical Bayer demosaicing noise across all color channels, which is computationally difficult to calibrate."
  },
  noise: {
    title: "Sensor Noise (PRNU) & Spatial Rich Models",
    what_is_it: "Hardware sensor fingerprinting using the Lukas PRNU model, Non-Local Means (NLM) patch denoising, and 2nd-order Spatial Rich Models (SRM).",
    what_it_does: "Uses Non-Local Means (NLM) patch denoising and a 2nd-order high-pass derivative filter to isolate Photo-Response Non-Uniformity and detect missing sensor noise.",
    how_good_is_it: "One of the most reliable physical forensics methods because generative neural networks generate mathematical pixels devoid of physical CMOS sensor silicon imperfections.",
    how_to_bypass: "Extracting the PRNU fingerprint from a genuine camera sensor and compositing it with calibrated variance over the synthetic face."
  },
  color: {
    title: "Chrominance Bleeding (YCbCr & CIELAB)",
    what_is_it: "Colorimetry analysis across non-RGB perceptual color channels (YCbCr, CIELAB, HSV).",
    what_it_does: "Calculates the color variance ratio Var(Cb)/Var(Y), monitors CIELAB a* capillary channel variance, and applies Gaussian edge attenuation to detect unnatural chrominance bleeding and flat skin tones.",
    how_good_is_it: "Catches neural face swaps that optimize purely for RGB structural loss without simulating biological sub-surface epidermal scattering.",
    how_to_bypass: "Using multi-band color transfer and spectral sub-surface scattering shaders during generation."
  },
  lighting: {
    title: "3D Spherical Harmonics Lighting Consistency",
    what_is_it: "Photometric illumination estimation using 9-coefficient real Spherical Harmonics (l <= 2) and background circular statistics.",
    what_it_does: "Reconstructs the 3D facial light probe over surface normals, renders a virtual 3D chrome sphere probe, and compares dominant lighting vectors against 2D Sobel background circular statistics and variance (1 - R).",
    how_good_is_it: "Exposes face swaps and composited subjects where the facial illumination angle contradicts the ambient scene background.",
    how_to_bypass: "Ensuring the source face and target background were captured under identical directional lighting and color temperature."
  },
  frequency: {
    title: "Frequency Domain Residuals (2D FFT, DCT, PCA, & Wavelets)",
    what_is_it: "Spectral physics analysis transforming pixel spatial arrays into orthogonal frequency coefficients.",
    what_it_does: "Combines 2D Fast Fourier Transforms with vectorized 8x8 block Discrete Cosine Transforms (DCT), Hou & Zhang spectral residual saliency, PCA color channel decomposition, and steep arctan switches (h_x).",
    how_good_is_it: "The gold standard for detecting GAN and diffusion models, which exhibit radial high-frequency starvation and periodic upsampling peaks.",
    how_to_bypass: "Applying frequency-domain adversarial perturbation masks or heavy spatial downsampling."
  },
  audio: {
    title: "Audio-Visual Synchronization (SyncNet 3D-CNN)",
    what_is_it: "Deep metric learning measuring phoneme-to-viseme temporal synchrony in a 1024-D joint metric space.",
    what_it_does: "Maps 13-dimensional MFCC acoustic features and 5-frame 3D spatiotemporal mouth crops into a shared joint embedding, computing LSE-D (distance) and LSE-C (confidence) metrics.",
    how_good_is_it: "Exposes Wav2Lip, AI dubbing, and voice replacement deepfakes where speech phonemes desynchronize from visual mouth articulation.",
    how_to_bypass: "Using expensive temporal 3D neural talking-head models with millisecond-accurate acoustic alignment."
  },
  voice: {
    title: "Voice Anti-Spoofing & Vocoder Detection",
    what_is_it: "Acoustic deep learning using a lightweight 2D-CNN with Depthwise Separable Convolutions (88.9% FLOP reduction).",
    what_it_does: "Evaluates 128-bin Mel-Spectrograms, zero-crossing rate (ZCR) variance, and 85% spectral rolloff, backed by cubic spline de-clipping and a mobile mic veto.",
    how_good_is_it: "Excellent at detecting commercial voice cloning tools (ElevenLabs, Tortoise-TTS, RVC) by isolating neural vocoder upsampling artifacts.",
    how_to_bypass: "Re-recording synthesized audio through an analog microphone in a physical acoustic space to introduce room impulse responses."
  },
  eye: {
    title: "Neuromotor Eye & Gaze Dynamics",
    what_is_it: "Temporal kinematic tracking of biological blink rates and bilateral gaze convergence.",
    what_it_does: "Runs a finite state machine on the Eye Aspect Ratio (EAR) over time to measure blink durations (100-400 ms) and check for pupil movement asymmetry.",
    how_good_is_it: "Highly effective for video media. Deepfakes frequently exhibit abnormal blink frequencies or independent, unsynchronized eye gaze vectors.",
    how_to_bypass: "Manually animating realistic eyelid closures and ensuring bilateral gaze tracking in post-production."
  },
  rppg: {
    title: "Cardiovascular rPPG Biological Hemodynamics",
    what_is_it: "Remote Photoplethysmography (CHROM pulse extraction) tracking subcutaneous blood volume pulses (BVP) via Shafer's dichromatic reflection model.",
    what_it_does: "Isolates right cheek, left cheek, and forehead capillary beds, filters with a 3rd-order zero-phase Butterworth filter (0.7-2.5 Hz, 42-150 BPM), and computes Fourier spectral SNR.",
    how_good_is_it: "The ultimate physiological liveness test. Generative AI fundamentally does not simulate a biological cardiovascular circulatory system.",
    how_to_bypass: "Artificially modulating the RGB skin pixels at 1.0-1.5 Hz to inject a synthetic pulse waveform."
  },
  flow: {
    title: "Dense Inverse Search (DIS) Optical Flow",
    what_is_it: "Spatiotemporal velocity field analysis tracking facial boundary shimmering and mask jitter.",
    what_it_does: "Applies Kroeger et al. DIS Optical Flow with facial ROI targeting to evaluate velocity field jitter via Variance of Variances Var(sigma_t^2).",
    how_good_is_it: "Catches temporal fluttering, mask warping discontinuities, and sliding face boundaries in video deepfakes.",
    how_to_bypass: "Using heavy temporal smoothing filters or training video generators with recurrent temporal loss constraints."
  },
  meta: {
    title: "EXIF & Container Stream Forensics",
    what_is_it: "Binary inspection of file headers, EXIF tags, and container atom streams.",
    what_it_does: "Scans for generative AI tool keywords (Midjourney, DALL-E, Stable Diffusion, Runway, Lavf), uninitialized clock epoch timestamps, and thumbnail dimension mismatches.",
    how_good_is_it: "Catches quick forgeries and direct AI generator exports before metadata stripping.",
    how_to_bypass: "Stripping all EXIF tags via specialized utilities or re-uploading media through messaging platforms that scrub metadata."
  }
};
