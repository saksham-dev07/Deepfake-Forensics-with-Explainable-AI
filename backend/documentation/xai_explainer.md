# Technical Specification & XAI Architecture: Explainable AI, Grad-CAM & Guided Backpropagation (`xai_explainer.py`)

**Implementation File**: [`backend/pipeline/xai_explainer.py`](../pipeline/xai_explainer.py)  
**Analytical Classification**: Explainable AI (XAI) / Visual Saliency Attribution / Gradient-Weighted Class Activation Mapping  
**Target Model Backbone**: Fine-Tuned EfficientNet-B4 (`model.conv_head`, 1792 Channels)  
**Target Class**: Index 0 (`ClassifierOutputTarget(0)` $\iff$ `FAKE` Class)  
**Core Algorithms**: Grad-CAM (Selvaraju et al., ICCV 2017) / Guided Backpropagation (Springenberg et al., ICLR 2015)  
**Primary Interface**: `XAIExplainer.generate_heatmap(input_tensor, original_image, save_path)`  

---

## 1. Executive Summary & Legal Evidentiary Theory

`xai_explainer.py` provides visual and mathematical interpretability for the deep learning decisions made by the convolutional neural network backbone (`models.py`).

In judicial courts, regulatory inquiries, and digital forensic investigations, "black box" deep learning predictions are subject to legal challenge under the Daubert standard and evidentiary rules regarding algorithmic transparency. Simply stating that a neural network classified an image as a deepfake with $99\%$ probability is legally insufficient; examiners must demonstrate **which specific spatial pixels and facial features compelled the decision**.

`xai_explainer.py` bridges this gap through a dual-resolution attribution pipeline:
1. **Coarse Semantic Localization (Grad-CAM)**: Pinpoints macro anatomical regions (such as eyes, mouth perimeter, or hairline boundaries) driving the `FAKE` classification.
2. **Fine-Grained Pixel Attribution (Guided Grad-CAM)**: Combines Guided Backpropagation with Grad-CAM masks to expose microscopic pixel-level artifacts (such as boundary interpolation blur, GAN checkerboard ringing, or skin texture discontinuities) using high-dynamic-range percentile contrast stretching.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           XAI EXPLAINER PIPELINE TOPOLOGY                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                     [Input Image Batch]
                                             │
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
            [Forward Pass: EfficientNet]              [Target Class Selection]
            Feature Activations at conv_head          Target = Class 0 (FAKE)
            A^k ∈ ℝ^{1792 × H' × W'}                  y^c = Logit(0)
                        │                                         │
                        └────────────────────┬────────────────────┘
                                             │
                                  [Backward Gradient Flow]
                                  ∂y^c / ∂A_{i, j}^k
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [Grad-CAM Engine]                        [Guided Backpropagation]
             Global Average Pooling of Gradients      Zeroes Out Negative Gradients & Acts
             Weights α_k^c = (1/Z) ∑∑ ∂y^c / ∂A^k     G_gbp(x, y) ∈ ℝ^{H × W × 3}
             L_cam = ReLU(∑ α_k^c · A^k)                           │
                       │                                           │
                       ▼                                           ▼
             Bilinear Upscaling to Image               [Element-Wise Hadamard Fusion]
             Alpha-Blend on Original RGB               G_guided = G_gbp ⊙ L_cam
             Save: {save_path}.jpg                                 │
                                                                   ▼
                                                       Single-Channel Magnitude
                                                       Percentile Stretch [P1 - P99]
                                                       Apply COLORMAP_INFERNO
                                                       Save: {save_path}_guided.jpg
```

---

## 2. Gradient-Weighted Class Activation Mapping (Grad-CAM)

Grad-CAM (Selvaraju et al., ICCV 2017) uses the gradient of the classification score with respect to the final convolutional feature maps to produce a coarse localization map highlighting important regions.

### 2.1 Target Layer Selection
```python
self.target_layers = [self.model.conv_head]
self.cam = GradCAM(model=self.model, target_layers=self.target_layers)
```
* **Target Layer**: `self.model.conv_head` represents the output of the final $1 \times 1$ convolution stage of EfficientNet-B4, outputting $C = 1792$ feature channels at $1/32$ spatial resolution ($12 \times 12$ spatial grid for a $380 \times 380$ input).
* *Forensic Rationale*: The final convolutional layer possesses the optimal balance between high-level semantic abstractions and spatial coordinate preservation.

### 2.2 Mathematical Formulation
1. **Target Score**:
   ```python
   targets = [ClassifierOutputTarget(0)]
   ```
   Targets specifically class index 0 (`FAKE`), computing the output score $y^0$.
2. **Neuron Importance Weights ($\alpha_k^0$)**:
   Evaluates the gradient of $y^0$ with respect to the $k$-th feature map $A^k$:
   $$\alpha_k^0 = \frac{1}{Z} \sum_{i=1}^H \sum_{j=1}^W \frac{\partial y^0}{\partial A_{i, j}^k}$$
   Where $Z = H \times W$ is the spatial area of the feature map. $\alpha_k^0$ represents a global average pooling of gradients, capturing the forensic importance of channel $k$ for the `FAKE` verdict.
3. **Rectified Weighted Sum**:
   Computes a weighted combination of forward activation maps followed by a Rectified Linear Unit ($\text{ReLU}$):
   $$L_{\text{Grad-CAM}}^0(x, y) = \text{ReLU}\left( \sum_{k=1}^{1792} \alpha_k^0 A^k(x, y) \right)$$
   *Applying $\text{ReLU}$ ensures the heatmap isolates features that positively contribute to the `FAKE` class, ignoring features that contribute toward `REAL`.*
4. **Bilinear Upscaling & Normalization**:
   Upscales $L_{\text{Grad-CAM}}^0$ to the native input image dimensions ($W \times H$) and normalizes to $[0.0, 1.0]$.
5. **Alpha-Blend Overlay**:
   ```python
   rgb_img = np.float32(original_image) / 255
   visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
   ```
   Blends the Jet-mapped activation heatmap over the photographic input:
   $$\mathbf{I}_{\text{vis}}(x, y) = 0.5 \cdot \mathbf{I}_{\text{RGB}}(x, y) + 0.5 \cdot \text{Jet}\left( L_{\text{Grad-CAM}}^0(x, y) \right)$$
   Saved to `{save_path}`.

---

## 3. High-Resolution Guided Grad-CAM Synthesis

While standard Grad-CAM highlights broad anatomical zones, it lacks pixel-level granularity. The module synthesizes **Guided Grad-CAM** by fusing Grad-CAM with **Guided Backpropagation** (Springenberg et al., ICLR 2015).

### 3.1 Guided Backpropagation Formulation
Standard backpropagation passes gradients backward through $\text{ReLU}$ layers according to:
$$\frac{\partial y}{\partial x_i} = \left( x_i > 0 \right) \cdot \frac{\partial y}{\partial y_i}$$

Guided Backpropagation restricts gradient flow to entries where *both* the input activation and the upstream gradient are strictly positive:
$$R_i^l = \left( x_i^l > 0 \right) \cdot \left( R_i^{l+1} > 0 \right) \cdot R_i^{l+1}$$
This prevents negative gradients (which suppress activations) from contaminating the backward signal, isolating pure pixel-level excitatory pathways:
$$\mathbf{G}_{\text{GBP}} \in \mathbb{R}^{H \times W \times 3}$$

### 3.2 Fusion & Magnitude Extraction
```python
cam_gb = guided_model(input_tensor, target_category=0)
guided_gradcam = np.multiply(cam_gb, np.expand_dims(grayscale_cam, axis=-1))
grad_magnitude = np.mean(np.abs(guided_gradcam), axis=-1)
```
1. **Pointwise Gating**:
   $$\mathbf{G}_{\text{GuidedGradCAM}}(x, y) = \mathbf{G}_{\text{GBP}}(x, y) \odot L_{\text{Grad-CAM}}^0(x, y)$$
   *Multiplication by $L_{\text{Grad-CAM}}^0$ acts as a spatial filter, suppressing fine-grained gradients outside the forensic region of interest.*
2. **Channel Collapse**:
   Evaluates absolute gradient magnitude across RGB channels:
   $$\mathbf{M}(x, y) = \frac{1}{3}\sum_{c \in \{R, G, B\}} \left| G_{\text{GuidedGradCAM}}^c(x, y) \right|$$

---

## 4. High Dynamic Range (HDR) Percentile Contrast Stretching

Raw backpropagated gradients frequently contain isolated, extreme numerical outliers that compress the visual dynamic range of the rest of the image into near-invisibility. The module applies a **robust percentile-based contrast stretch**:

```python
p_low, p_high = np.percentile(grad_magnitude, [1, 99])
if p_high - p_low > 1e-8:
    grad_magnitude = np.clip((grad_magnitude - p_low) / (p_high - p_low), 0, 1)
else:
    grad_magnitude = grad_magnitude / (np.max(grad_magnitude) + 1e-7)

grad_uint8 = np.uint8(255 * grad_magnitude)
guided_colored = cv2.applyColorMap(grad_uint8, cv2.COLORMAP_INFERNO)
```

1. **Percentile Estimation**: Calculates the 1st percentile ($p_1$) and 99th percentile ($p_{99}$) of gradient magnitudes.
2. **Linear Min-Max Clipping**:
   $$\mathbf{M}_{\text{HDR}}(x, y) = \text{clip}\left( \frac{\mathbf{M}(x, y) - p_1}{p_{99} - p_1}, \; 0.0, \; 1.0 \right)$$
3. **Scientific Colormap Mapping**:
   Maps $\mathbf{M}_{\text{HDR}} \times 255$ via `cv2.COLORMAP_INFERNO`:
   * Black/Purple: Zero deepfake attribution.
   * Red/Orange: Moderate manipulation gradients.
   * Bright Yellow/White: Peak manipulation centers (e.g. splice boundaries, unnatural skin warping).
   Saved to `{save_path.replace(".jpg", "_guided.jpg")}`.

---

## 5. Visual Artifacts Specification

| Output Path | Algorithm | Colormap | Forensic Diagnostic Purpose |
| :--- | :--- | :---: | :--- |
| **`{prefix}_heatmap.jpg`** | Standard Grad-CAM | `JET` over RGB | Macro anatomical localization; shows whether the network focused on the mouth, eyes, or face boundary. |
| **`{prefix}_heatmap_guided.jpg`** | Guided Grad-CAM | `INFERNO` | Microscopic pixel-level attribution; exposes blending seams, pixel warping vectors, and high-frequency GAN artifacts. |

---

## 6. Interface Specification & Schema

### Class Definition
```python
class XAIExplainer:
    def __init__(self, model: torch.nn.Module)
```

### Key Methods:
* **`generate_heatmap(input_tensor, original_image, save_path) -> tuple[str | None, str | None]`**:
  * **`input_tensor`** (`torch.Tensor`): Normalized input image batch $[1, 3, H, W]$.
  * **`original_image`** (`np.ndarray`): Raw RGB image array $[H, W, 3]$ with uint8 values $[0, 255]$.
  * **`save_path`** (`str`): Target path for the standard Grad-CAM overlay.
  * **Returns**: Tuple containing `(standard_cam_path, guided_cam_path)`.
* **`get_shap_features() -> list[str]`**:
  * Returns qualitative explanatory statements summarizing regional anomalies.

---

## 7. Meta-Classifier & Downstream Integration

* **Integration Point**: Invocated by `main.py` whenever the neural network detects high-probability deepfake manipulations.
* **Reporting Integration**: Both generated images (`{prefix}_heatmap.jpg` and `{prefix}_heatmap_guided.jpg`) are embedded directly into **Chapter 8 (Visual Evidence Gallery)** of the final court-admissible forensic PDF report (`pdf_reporter.py`).
* **Safety Guards Handled**:
  1. **Layer Missing Guard**: If the target model lacks `.conv_head`, sets `self.available = False` and returns `(None, None)` without raising exceptions.
  2. **Singularity Guard**: Dynamic range division uses $\epsilon = 10^{-8}$ and $\epsilon = 10^{-7}$ guards to prevent divide-by-zero crashes on uniform or blank image inputs.
  3. **Guided Backprop Fallback**: Wraps Guided Grad-CAM execution in a try-except block to gracefully return standard Grad-CAM if Guided Backprop fails.
