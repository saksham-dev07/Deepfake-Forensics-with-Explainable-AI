export const TEST_DEFINITIONS = {
  features: {
    title: "Multi-Modal Ensemble",
    what_is_it: "A weighted combination of all detection techniques across multiple domains.",
    what_it_does: "Aggregates the physical, mathematical, and AI-based anomaly scores to calculate a final confidence metric.",
    how_good_is_it: "Extremely reliable because it doesn't rely on a single point of failure.",
    how_to_bypass: "Nearly impossible to bypass completely; requires defeating spatial, temporal, frequency, and biological detectors simultaneously."
  },
  visual: {
    title: "GradCAM (Gradient-weighted Class Activation Mapping)",
    what_is_it: "A visual explanation for the primary Neural Network's decision.",
    what_it_does: "Highlights the specific pixels and regions that caused the AI to classify the face as fake or real.",
    how_good_is_it: "Great for interpretability, showing exactly where blending boundaries or warping occurred.",
    how_to_bypass: "It is an interpretation tool, not a detector itself. Bypassing the underlying CNN will result in a blank or incorrect GradCAM map."
  },
  ela: {
    title: "Error Level Analysis (ELA)",
    what_is_it: "A forensic technique that identifies areas within an image that are at different compression levels.",
    what_it_does: "Resaves the image at a known error rate (e.g., 95% JPEG quality) and computes the difference. Spliced regions will stand out as they compress differently.",
    how_good_is_it: "Excellent for detecting cheap Photoshop jobs and basic splices on high-quality images.",
    how_to_bypass: "Saving the final forged image multiple times at very low quality, or applying uniform noise across the entire image, destroys ELA trails."
  },
  geometry: {
    title: "Facial Geometry Analysis",
    what_is_it: "A biometric test mapping 3D facial landmarks to check biological proportions.",
    what_it_does: "Calculates the distance between microscopic facial features and checks for unnatural mathematical asymmetries or violations of the golden ratio.",
    how_good_is_it: "Very strong against standard GAN-based Deepfakes which often struggle with geometric perspective and pupil alignment.",
    how_to_bypass: "Using high-end 3D rendering (CGI) or advanced diffusion models with strong structural priors can occasionally bypass this."
  },
  corneal: {
    title: "Corneal Optics Reflection",
    what_is_it: "An analysis of the specular highlights (reflections) on the eyes.",
    what_it_does: "Extracts the lighting environment reflected in the left and right eyes and checks for geometric and illumination consistency.",
    how_good_is_it: "Highly accurate for close-up portraits. Deepfakes almost always render mismatched reflections in the eyes.",
    how_to_bypass: "Requires generating physically accurate 3D scene lighting or manually editing the reflections in post-production."
  },
  cfa: {
    title: "Color Filter Array (CFA) Forensics",
    what_is_it: "Detection of hardware-level camera signatures.",
    what_it_does: "Extracts the microscopic Bayer filter grid left by real digital cameras. AI-generated images lack this grid entirely.",
    how_good_is_it: "Extremely robust for identifying fully AI-generated images (like Midjourney).",
    how_to_bypass: "Adding synthetic CFA noise patterns to the generated image, though very difficult to align perfectly with spliced backgrounds."
  },
  noise: {
    title: "Sensor Noise (PRNU)",
    what_is_it: "Analysis of the invisible 'noise print' unique to physical camera sensors.",
    what_it_does: "Uses Non-Local Means and high-pass filters to isolate camera noise. Deepfakes appear unnaturally smooth or have mismatched noise variance.",
    how_good_is_it: "One of the strongest forensic techniques against generative AI, which intrinsically lacks physical camera noise.",
    how_to_bypass: "Extracting the PRNU from the real background and artificially injecting it over the synthetic face."
  },
  color: {
    title: "Chrominance (Color Space)",
    what_is_it: "Analysis of non-visible color channels (YCbCr, LAB).",
    what_it_does: "Isolates color variance. Human skin has complex subsurface scattering; AI skin often appears mathematically flat or 'bleeds' color across edges.",
    how_good_is_it: "Very effective against early Deepfakes and FaceSwaps that only optimize for structural RGB similarity.",
    how_to_bypass: "Advanced color-transfer algorithms and multi-band blending can synthesize realistic chrominance."
  },
  lighting: {
    title: "2D Illumination Estimation",
    what_is_it: "Calculation of the dominant light source direction.",
    what_it_does: "Extracts surface normals to estimate the light direction of the face vs the background. High divergence indicates a spliced image.",
    how_good_is_it: "Strong against naive face swaps placed into differently lit environments.",
    how_to_bypass: "Ensuring the source face and target body were filmed under identical lighting conditions."
  },
  frequency: {
    title: "Frequency Domain Analysis",
    what_is_it: "Mathematical transformation of the image into wave frequencies (FFT/DCT).",
    what_it_does: "Reveals hidden periodic artifacts, high-frequency blurring, and GAN 'checkerboard' patterns that are invisible in the spatial domain.",
    how_good_is_it: "The gold standard for detecting CNN/GAN generated content.",
    how_to_bypass: "Applying specialized frequency-domain adversarial noise or heavy downsampling."
  },
  audio: {
    title: "Audio-Visual Synchronization",
    what_is_it: "Lip-sync error detection using 3D-CNNs.",
    what_it_does: "Measures the sub-millisecond distance between the audio phonemes and the visual mouth movements.",
    how_good_is_it: "Highly effective against Wav2Lip and audio-driven deepfakes.",
    how_to_bypass: "Using highly advanced, computation-heavy renderers that perfectly match muscle articulation to audio."
  },
  voice: {
    title: "Voice Anti-Spoofing",
    what_is_it: "Spectral analysis of the audio track.",
    what_it_does: "Analyzes Mel-Frequency spectrograms for high-frequency synthetic artifacts and unnatural spectral roll-offs common in AI voice clones.",
    how_good_is_it: "Excellent at catching commercial voice clones like ElevenLabs.",
    how_to_bypass: "Re-recording the AI voice through an analog microphone in a physical room to add natural acoustic impedance."
  },
  eye: {
    title: "Eye & Gaze Dynamics",
    what_is_it: "Temporal tracking of blink rates and eye convergence.",
    what_it_does: "Calculates the Eye Aspect Ratio (EAR) over time to flag unnatural 'lazy eye', asynchronous blinking, or abnormal blink frequencies.",
    how_good_is_it: "Very strong for video. Deepfakes often forget to blink or render eyes moving independently.",
    how_to_bypass: "Manually keyframing blinks or using temporal-aware generation models."
  },
  rppg: {
    title: "Biological Signal (rPPG)",
    what_is_it: "Remote Photoplethysmography (Heartbeat detection).",
    what_it_does: "Measures the microscopic color shifts in the skin caused by blood flow to detect a human pulse.",
    how_good_is_it: "The ultimate 'liveness' test. Generative AI fundamentally does not simulate a cardiovascular system.",
    how_to_bypass: "Artificially modulating the RGB values of the synthetic face at a frequency of 1-2 Hz to fake a heartbeat."
  },
  flow: {
    title: "Dense Optical Flow",
    what_is_it: "Motion vector tracking across frames.",
    what_it_does: "Calculates the variance of pixel movement over time to detect unnatural jittering, flickering, or sliding facial masks.",
    how_good_is_it: "Excellent for catching temporal instability in poorly rendered deepfake videos.",
    how_to_bypass: "Using expensive temporal smoothing networks or rendering at extremely high frame rates."
  },
  meta: {
    title: "Metadata & File Analysis",
    what_is_it: "Analysis of the hidden data embedded inside the file structure.",
    what_it_does: "Examines EXIF tags, creation dates, software signatures, and file streams to find traces of editing software (e.g., Photoshop, FFmpeg).",
    how_good_is_it: "Useful for catching lazy deepfakers who don't scrub their metadata before uploading.",
    how_to_bypass: "Running the file through social media platforms (which strip metadata) or manually deleting the EXIF data."
  }
};
