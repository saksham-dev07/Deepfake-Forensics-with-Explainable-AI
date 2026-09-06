# Technical Specification & Neural Architecture: Dual-Stream Audio-Visual SyncNet Model (`SyncNetModel.py`)

**Implementation File**: [`backend/pipeline/SyncNetModel.py`](../pipeline/SyncNetModel.py)  
**Analytical Classification**: Deep Metric Learning / Multi-Modal Audio-Visual Synchronization / Siamese Two-Tower Network  
**Acoustic Backbone**: 2D Convolutional Acoustic Encoder (`netcnnaud` + `netfcaud`)  
**Visual Lip Backbone**: 3D Spatiotemporal Convolutional Lip Encoder (`netcnnlip` + `netfclip`)  
**Shared Embedding Dimension**: 1024-Dimensional Joint Audio-Visual Latent Space (`num_layers_in_fc_layers = 1024`)  
**Foundational Citation**: Chung & Zisserman, *Out of time: automated lip sync in the wild*, ACCV 2016  

---

## 1. Executive Summary & Forensic Synchronization Theory

`SyncNetModel.py` defines the deep neural Siamese network architecture responsible for mapping acoustic speech audio and visual lip movements into a unified, shared embedding space.

In natural human speech, the biomechanics of vocal tract articulation dictate that phonetic sounds (phonemes) and visual mouth geometries (visemes) occur in strict temporal synchrony. Acoustic formant peaks (such as bilabial stops `/p/`, `/b/`, `/m/` or labiodental fricatives `/f/`, `/v/`) require distinct physical lip closures or teeth-to-lip contacts within a tight biological window of $\pm 50\text{ ms}$.

### The Deepfake Dubbing & Synthesis Anomaly:
State-of-the-art deepfake manipulation tools (e.g. Wav2Lip, SadTalker, FaceSwap, AI voice cloning) alter video or audio tracks independently:
1. **Phoneme-Viseme Desynchronization**: While a generated mouth opens during speech, its aperture does not match the phonetic acoustic properties of the audio track.
2. **Temporal Audio-Visual Lag**: Re-dubbed audio or asynchronous rendering causes a constant or fluctuating temporal offset.
3. **Contrastive Distance Spikes**: In the joint 1024-dimensional metric space, authentic pairs cluster tightly together ($d < 0.8$), whereas desynchronized deepfakes diverge into distant manifolds ($d > 1.4$).

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           SYNCNET TWO-TOWER ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘

        [Acoustic Audio Stream]                              [Visual Lip Stream]
        2D Spectrogram / MFCC Tensors                        5-Frame Video Volume
        X_aud ∈ ℝ^{B × 1 × H × W}                           X_lip ∈ ℝ^{B × 3 × 5 × 112 × 112}
                  │                                                    │
                  ▼                                                    ▼
        [2D-CNN Audio Encoder]                               [3D-CNN Spatiotemporal Encoder]
        netcnnaud: 6 Conv2D Stages                           netcnnlip: 6 Conv3D Stages
        BN + ReLU + MaxPool                                  BN + ReLU + MaxPool3D
        Kernels: (3×3) to (5×4)                              Time Filter (5) Collapses Time
                  │                                                    │
                  ▼                                                    ▼
        Feature Tensor [B, 512, 1, 1]                        Feature Tensor [B, 512, 1, 1, 1]
                  │                                                    │
                  ▼                                                    ▼
        [Fully Connected Head: netfcaud]                     [Fully Connected Head: netfclip]
        Linear(512, 512) -> BN -> ReLU                       Linear(512, 512) -> BN -> ReLU
        Linear(512, 1024)                                    Linear(512, 1024)
                  │                                                    │
                  └──────────────────────────┬─────────────────────────┘
                                             │
                                             ▼
                             Joint Metric Space ℝ^{B × 1024}
                             e_aud, e_lip ∈ ℝ^{B × 1024}
                                             │
                             Euclidean / Cosine Distance
                             d = || e_aud / ||e_aud|| - e_lip / ||e_lip|| ||_2
                                             │
                             Forensic Sync Metric: LSE-C / LSE-D
```

---

## 2. Acoustic Stream Architecture: `netcnnaud` & `netfcaud`

The acoustic branch ingests a 2D time-frequency representation of speech (typically Mel-Frequency Cepstral Coefficients or STFT spectrograms) with input shape $[B, 1, H_{\text{mfcc}}, W_{\text{mfcc}}]$.

### 2.1 2D Convolutional Backbone: `netcnnaud`
```python
self.netcnnaud = nn.Sequential(
    nn.Conv2d(1, 64, kernel_size=(3,3), stride=(1,1), padding=(1,1)),
    nn.BatchNorm2d(64),
    nn.ReLU(inplace=True),
    nn.MaxPool2d(kernel_size=(1,1), stride=(1,1)),

    nn.Conv2d(64, 192, kernel_size=(3,3), stride=(1,1), padding=(1,1)),
    nn.BatchNorm2d(192),
    nn.ReLU(inplace=True),
    nn.MaxPool2d(kernel_size=(3,3), stride=(1,2)),

    nn.Conv2d(192, 384, kernel_size=(3,3), padding=(1,1)),
    nn.BatchNorm2d(384),
    nn.ReLU(inplace=True),

    nn.Conv2d(384, 256, kernel_size=(3,3), padding=(1,1)),
    nn.BatchNorm2d(256),
    nn.ReLU(inplace=True),

    nn.Conv2d(256, 256, kernel_size=(3,3), padding=(1,1)),
    nn.BatchNorm2d(256),
    nn.ReLU(inplace=True),
    nn.MaxPool2d(kernel_size=(3,3), stride=(2,2)),

    nn.Conv2d(256, 512, kernel_size=(5,4), padding=(0,0)),
    nn.BatchNorm2d(512),
    nn.ReLU(),
)
```

| Layer Stage | Operator | Kernel Size | Stride | Padding | Output Channels |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Conv 1** | `Conv2d + BN + ReLU` | $(3, 3)$ | $(1, 1)$ | $(1, 1)$ | $64$ |
| **Pool 1** | `MaxPool2d` | $(1, 1)$ | $(1, 1)$ | $(0, 0)$ | $64$ |
| **Conv 2** | `Conv2d + BN + ReLU` | $(3, 3)$ | $(1, 1)$ | $(1, 1)$ | $192$ |
| **Pool 2** | `MaxPool2d` | $(3, 3)$ | $(1, 2)$ | $(0, 0)$ | $192$ |
| **Conv 3** | `Conv2d + BN + ReLU` | $(3, 3)$ | $(1, 1)$ | $(1, 1)$ | $384$ |
| **Conv 4** | `Conv2d + BN + ReLU` | $(3, 3)$ | $(1, 1)$ | $(1, 1)$ | $256$ |
| **Conv 5** | `Conv2d + BN + ReLU` | $(3, 3)$ | $(1, 1)$ | $(1, 1)$ | $256$ |
| **Pool 3** | `MaxPool2d` | $(3, 3)$ | $(2, 2)$ | $(0, 0)$ | $256$ |
| **Conv 6** | `Conv2d + BN + ReLU` | $(5, 4)$ | $(1, 1)$ | $(0, 0)$ | $512$ |

### 2.2 Audio Projection Head: `netfcaud`
Flattens the spatial channels to a 512-dimensional feature vector and projects to the shared metric space:
```python
self.netfcaud = nn.Sequential(
    nn.Linear(512, 512),
    nn.BatchNorm1d(512),
    nn.ReLU(),
    nn.Linear(512, num_layers_in_fc_layers), # 1024
)
```

---

## 3. Visual Lip Stream Architecture: `netcnnlip` & `netfclip`

The visual branch processes a spatiotemporal volume of cropped mouth frames: $X_{\text{lip}} \in \mathbb{R}^{B \times 3 \times T \times H \times W}$ (where $T = 5$ frames centered around the evaluated timestamp, and spatial dimension is $112 \times 112$).

### 3.1 3D Spatiotemporal Convolutional Backbone: `netcnnlip`
```python
self.netcnnlip = nn.Sequential(
    nn.Conv3d(3, 96, kernel_size=(5,7,7), stride=(1,2,2), padding=0),
    nn.BatchNorm3d(96),
    nn.ReLU(inplace=True),
    nn.MaxPool3d(kernel_size=(1,3,3), stride=(1,2,2)),

    nn.Conv3d(96, 256, kernel_size=(1,5,5), stride=(1,2,2), padding=(0,1,1)),
    nn.BatchNorm3d(256),
    nn.ReLU(inplace=True),
    nn.MaxPool3d(kernel_size=(1,3,3), stride=(1,2,2), padding=(0,1,1)),

    nn.Conv3d(256, 256, kernel_size=(1,3,3), padding=(0,1,1)),
    nn.BatchNorm3d(256),
    nn.ReLU(inplace=True),

    nn.Conv3d(256, 256, kernel_size=(1,3,3), padding=(0,1,1)),
    nn.BatchNorm3d(256),
    nn.ReLU(inplace=True),

    nn.Conv3d(256, 256, kernel_size=(1,3,3), padding=(0,1,1)),
    nn.BatchNorm3d(256),
    nn.ReLU(inplace=True),
    nn.MaxPool3d(kernel_size=(1,3,3), stride=(1,2,2)),

    nn.Conv3d(256, 512, kernel_size=(1,6,6), padding=0),
    nn.BatchNorm3d(512),
    nn.ReLU(inplace=True),
)
```

| Layer Stage | Operator | 3D Kernel Size $(T, H, W)$ | Stride | Padding | Output Channels |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Conv3D 1**| `Conv3d + BN + ReLU` | $(5, 7, 7)$ | $(1, 2, 2)$ | $(0, 0, 0)$ | $96$ |
| **Pool3D 1**| `MaxPool3d` | $(1, 3, 3)$ | $(1, 2, 2)$ | $(0, 0, 0)$ | $96$ |
| **Conv3D 2**| `Conv3d + BN + ReLU` | $(1, 5, 5)$ | $(1, 2, 2)$ | $(0, 1, 1)$ | $256$ |
| **Pool3D 2**| `MaxPool3d` | $(1, 3, 3)$ | $(1, 2, 2)$ | $(0, 1, 1)$ | $256$ |
| **Conv3D 3**| `Conv3d + BN + ReLU` | $(1, 3, 3)$ | $(1, 1, 1)$ | $(0, 1, 1)$ | $256$ |
| **Conv3D 4**| `Conv3d + BN + ReLU` | $(1, 3, 3)$ | $(1, 1, 1)$ | $(0, 1, 1)$ | $256$ |
| **Conv3D 5**| `Conv3d + BN + ReLU` | $(1, 3, 3)$ | $(1, 1, 1)$ | $(0, 1, 1)$ | $256$ |
| **Pool3D 3**| `MaxPool3d` | $(1, 3, 3)$ | $(1, 2, 2)$ | $(0, 0, 0)$ | $256$ |
| **Conv3D 6**| `Conv3d + BN + ReLU` | $(1, 6, 6)$ | $(1, 1, 1)$ | $(0, 0, 0)$ | $512$ |

* **Critical Temporal Collapse**: Notice that **Conv3D Layer 1** uses a temporal kernel dimension of $5$ with zero temporal padding ($T=5 \rightarrow T=1$). It immediately fuses all 5 temporal video frames into a single spatiotemporal representation. Subsequent layers operate with temporal kernel size $1$, functioning as spatial feature extractors over the temporal summary!

### 3.2 Visual Lip Projection Head: `netfclip`
```python
self.netfclip = nn.Sequential(
    nn.Linear(512, 512),
    nn.BatchNorm1d(512),
    nn.ReLU(),
    nn.Linear(512, num_layers_in_fc_layers), # 1024
)
```

---

## 4. Forward Methods & Embedding Extraction

The class `S` provides three forward methods:

### 4.1 Audio Forward Pass: `forward_aud(x)`
```python
def forward_aud(self, x):
    mid = self.netcnnaud(x)
    mid = mid.view((mid.size(0), -1))
    out = self.netfcaud(mid)
    return out
```
* Returns the 1024-dimensional acoustic embedding $\mathbf{e}_{\text{aud}} \in \mathbb{R}^{B \times 1024}$.

### 4.2 Visual Lip Forward Pass: `forward_lip(x)`
```python
def forward_lip(self, x):
    mid = self.netcnnlip(x)
    mid = mid.view((mid.size(0), -1))
    out = self.netfclip(mid)
    return out
```
* Returns the 1024-dimensional visual lip embedding $\mathbf{e}_{\text{lip}} \in \mathbb{R}^{B \times 1024}$.

### 4.3 Raw Feature Extraction: `forward_lipfeat(x)`
```python
def forward_lipfeat(self, x):
    mid = self.netcnnlip(x)
    out = mid.view((mid.size(0), -1))
    return out
```
* Extracts pre-FC 512-dimensional visual feature representations prior to projection.

---

## 5. Metric Learning & Contrastive Loss Formulation

SyncNet is trained using a contrastive margin loss on synchronized ($y=1$) and desynchronized ($y=0$) audio-visual pairs:

$$\mathcal{L}_{\text{contrastive}} = \frac{1}{2} y \cdot d^2 + \frac{1}{2} (1 - y) \cdot \max(0, m - d)^2$$

Where $m$ is the contrastive margin ($m \approx 1.5 - 2.0$), and $d$ is the normalized Euclidean distance:

$$d(\mathbf{e}_{\text{aud}}, \mathbf{e}_{\text{lip}}) = \left\| \frac{\mathbf{e}_{\text{aud}}}{\|\mathbf{e}_{\text{aud}}\|_2} - \frac{\mathbf{e}_{\text{lip}}}{\|\mathbf{e}_{\text{lip}}\|_2} \right\|_2$$

### Forensic Desynchronization Metrics:
1. **LSE-D (Lip-Sync Error - Distance)**:
   $$\text{LSE-D} = \min_{v \in [-V, +V]} d(\mathbf{e}_{\text{aud}}(t), \mathbf{e}_{\text{lip}}(t + v))$$
   The minimum Euclidean distance across temporal search offsets $v$.
2. **LSE-C (Lip-Sync Error - Confidence)**:
   $$\text{LSE-C} = \text{median}(d) - \min(d)$$
   Measures the distinctness of the synchronized valley. High confidence ($>6.0$) indicates genuine human speech; low confidence ($<2.0$) indicates deepfake AI dubbing or audio replacement.

---

## 6. Interface Specification & Schema

### Class Definition
```python
class S(nn.Module):
    def __init__(self, num_layers_in_fc_layers: int = 1024)
```

### Input Tensors:
* **Audio Input (`x_aud`)**: `torch.FloatTensor` of shape $(B, 1, 13, 20)$ or $(B, 1, H, W)$ representing audio MFCC/spectrogram segments.
* **Lip Input (`x_lip`)**: `torch.FloatTensor` of shape $(B, 3, 5, 112, 112)$ representing 5 consecutive RGB video frames of the cropped mouth region.

### Output Tensors:
* **`forward_aud(x)`**: `torch.FloatTensor` of shape $(B, 1024)$.
* **`forward_lip(x)`**: `torch.FloatTensor` of shape $(B, 1024)$.
* **`forward_lipfeat(x)`**: `torch.FloatTensor` of shape $(B, 512)$.

---

## 7. Meta-Classifier Integration & Production Usage

* **Upstream Consumer**: Loaded by `pipeline/audio_sync.py` to evaluate the synchronization error of video clips.
* **Ensemble Position**: The resulting synchronization metrics feed into **Input Feature Index 12** (`sync_score`) in the PyTorch Tabular ResNet (`ensemble_classifier.py`).
* **Pretrained Model File**: Compatible with official pre-trained weights from `weights/syncnet_v2.model` (Chung et al. / Rudrabha Wav2Lip).
