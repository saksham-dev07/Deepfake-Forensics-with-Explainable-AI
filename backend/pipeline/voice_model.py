import torch
import torch.nn as nn
import torch.nn.functional as F
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
    Lightweight CNN inspired by 'A Lightweight and Efficient Model for Audio Anti-Spoofing'.
    Takes 1-channel Mel-Spectrograms as input and outputs a spoofing probability.
    """
    def __init__(self):
        super().__init__()
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
        
        if os.path.exists(path):
            self.load_state_dict(torch.load(path, map_location=device, weights_only=True))
        else:
            print(f"Warning: Synthetic voice weights not found at {path}.")
            
    def predict(self, mel_spectrogram):
        """
        Predicts whether the audio is spoofed (1.0 = Fake, 0.0 = Real).
        mel_spectrogram: numpy array of shape (Mels, Time)
        """
        device = next(self.parameters()).device
        self.eval()
        
        with torch.no_grad():
            # Convert to tensor and add Batch and Channel dimensions
            tensor = torch.FloatTensor(mel_spectrogram).unsqueeze(0).unsqueeze(0).to(device)
            prob = self(tensor).item()
            
        return prob

if __name__ == "__main__":
    # Generate synthetic dummy weights
    model = LightweightAudioAntiSpoof()
    weights_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "voice_spoofing.pth")
    torch.save(model.state_dict(), weights_path)
    print(f"Initialized PyTorch Voice Spoofing model with synthetic weights at {weights_path}")
