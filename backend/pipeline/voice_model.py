import torch
import torch.nn as nn
import os

class DepthwiseSeparableConv(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super().__init__()
        self.depthwise = nn.Conv2d(in_channels, in_channels, kernel_size=3, padding=1, stride=stride, groups=in_channels, bias=False)
        self.pointwise = nn.Conv2d(in_channels, out_channels, kernel_size=1, bias=False)
        self.bn = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        x = self.depthwise(x)
        x = self.pointwise(x)
        x = self.bn(x)
        return self.relu(x)

class LightweightAudioAntiSpoof(nn.Module):
    """
    Project-specific depthwise CNN returning an uncalibrated spoofing score.

    The checkpoint contains no training/configuration metadata. This architecture
    must not be presented as a reproduced published ASVspoof baseline.
    """
    def __init__(self):
        super().__init__()
        self.weights_loaded = False
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(16),
            nn.ReLU(inplace=True),
            
            DepthwiseSeparableConv(16, 32, stride=2),
            DepthwiseSeparableConv(32, 64, stride=2),
            DepthwiseSeparableConv(64, 128, stride=2),
            DepthwiseSeparableConv(128, 128, stride=1),
        )
        
        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d((1, 1)),
            nn.Flatten(),
            nn.Linear(128, 64),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        # x shape: (Batch, 1, Mels, Time)
        x = self.features(x)
        x = self.classifier(x)
        return x

    def load_weights(self, path=None):
        if path is None:
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "voice_spoofing.pth")
        
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.to(device)
        
        self.weights_loaded = False
        if not os.path.exists(path):
            raise FileNotFoundError(f"Voice weights not found: {path}")
        state = torch.load(path, map_location=device, weights_only=True)
        if not state or any(not torch.isfinite(value).all() for value in state.values()):
            raise ValueError("Voice checkpoint contains missing or non-finite tensors")
        self.load_state_dict(state)
        self.eval()
        self.weights_loaded = True
            
    def predict(self, mel_spectrogram):
        """
        Return the checkpoint's sigmoid score, not a calibrated probability.
        Input is a finite, normalized array of shape (128, 256).
        """
        if not self.weights_loaded:
            raise RuntimeError("Load trained voice weights before prediction")
        device = next(self.parameters()).device
        self.eval()
        
        tensor = torch.as_tensor(mel_spectrogram, dtype=torch.float32)
        if tensor.shape != (128, 256) or not torch.isfinite(tensor).all():
            raise ValueError("Voice model requires a finite (128, 256) mel spectrogram")
        if tensor.min() < 0 or tensor.max() > 1:
            raise ValueError("Voice model mel input must be normalized to [0, 1]")
        with torch.inference_mode():
            tensor = tensor.unsqueeze(0).unsqueeze(0).to(device)
            prob = self(tensor).item()
        if not 0 <= prob <= 1:
            raise ValueError("Voice checkpoint returned an invalid score")
        return prob

if __name__ == "__main__":
    model = LightweightAudioAntiSpoof()
    model.load_weights()
    print("Voice checkpoint loaded successfully (no weights were modified).")
