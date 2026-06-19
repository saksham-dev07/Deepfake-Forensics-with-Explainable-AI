"""
Kaggle Training Script for Voice Spoofing CNN
Dataset: ASVspoof 2019 Logical Access (LA)
Upload this script to a Kaggle Notebook, attach the ASVspoof 2019 dataset, and run it.
"""

import os
import glob
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import librosa
import numpy as np
from tqdm import tqdm

# ---------------------------------------------------------------------------
# 1. ARCHITECTURE (Must exactly match local pipeline/voice_model.py)
# ---------------------------------------------------------------------------
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
        x = self.features(x)
        x = self.classifier(x)
        return x

# ---------------------------------------------------------------------------
# 2. DATASET LOADER
# ---------------------------------------------------------------------------
class ASVSpoofDataset(Dataset):
    def __init__(self, data_dir, protocol_path, target_frames=256):
        """
        data_dir: Path to the flac audio files (e.g. /kaggle/input/asvpoof-2019-dataset/LA/LA/ASVspoof2019_LA_train/flac)
        protocol_path: Path to the labels txt file.
        """
        self.data_dir = data_dir
        self.target_frames = target_frames
        
        # Read labels from protocol file
        self.samples = []
        with open(protocol_path, 'r') as f:
            for line in f.readlines():
                parts = line.strip().split()
                if len(parts) >= 5:
                    speaker_id, file_id, _, system_id, key = parts
                    # key is 'bonafide' (0.0) or 'spoof' (1.0)
                    label = 0.0 if key == 'bonafide' else 1.0
                    self.samples.append({
                        "file_id": file_id,
                        "label": label
                    })

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        file_path = os.path.join(self.data_dir, f"{sample['file_id']}.flac")
        
        try:
            # Extract exactly as in local voice_spoofing.py
            y, sr = librosa.load(file_path, sr=None)
            M = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
            M_db = librosa.power_to_db(M, ref=np.max)
            
            # Normalize
            M_norm = (M_db - M_db.min()) / (M_db.max() - M_db.min() + 1e-8)
            
            # Resize
            if M_norm.shape[1] < self.target_frames:
                pad_width = self.target_frames - M_norm.shape[1]
                M_cnn_input = np.pad(M_norm, ((0, 0), (0, pad_width)), mode='constant')
            else:
                M_cnn_input = M_norm[:, :self.target_frames]
                
            tensor = torch.FloatTensor(M_cnn_input).unsqueeze(0) # Shape: (1, 128, 256)
            label = torch.FloatTensor([sample['label']])
            return tensor, label
            
        except Exception as e:
            # Fallback for corrupted files
            return torch.zeros((1, 128, self.target_frames)), torch.FloatTensor([0.5])

# ---------------------------------------------------------------------------
# 3. TRAINING LOOP
# ---------------------------------------------------------------------------
def train_model():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")
    
    if device.type == "cpu":
        print("\n[!] WARNING: You are training on the CPU! This will be extremely slow.")
        print("Please go to the right sidebar in Kaggle -> Settings -> Accelerator and select 'GPU T4 x2'.\n")
    
    # KAGGLE PATHS (Specifically for the awsaf49/asvpoof-2019-dataset you attached)
    TRAIN_FLAC_DIR = "/kaggle/input/asvpoof-2019-dataset/LA/LA/ASVspoof2019_LA_train/flac"
    TRAIN_PROTOCOL = "/kaggle/input/asvpoof-2019-dataset/LA/LA/ASVspoof2019_LA_cm_protocols/ASVspoof2019.LA.cm.train.trn.txt"
    
    if not os.path.exists(TRAIN_PROTOCOL):
        print("\n[!] ERROR: Could not find the ASVspoof 2019 dataset at the expected path!")
        print(f"Looked for: {TRAIN_PROTOCOL}")
        print("Please ensure you added 'awsaf49/asvpoof-2019-dataset'.")
        return

    print("Loading dataset...")
    dataset = ASVSpoofDataset(TRAIN_FLAC_DIR, TRAIN_PROTOCOL)
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True, num_workers=4)
    
    model = LightweightAudioAntiSpoof().to(device)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    epochs = 10
    
    print("Starting Training...")
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        
        # tqdm for nice Kaggle progress bar
        pbar = tqdm(dataloader, desc=f"Epoch {epoch+1}/{epochs}")
        for inputs, labels in pbar:
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            pbar.set_postfix({'loss': running_loss / (pbar.n + 1)})
            
    print("Training Complete!")
    
    # Save the weights to Kaggle's working directory so they can be downloaded
    save_path = "/kaggle/working/voice_spoofing.pth"
    torch.save(model.state_dict(), save_path)
    print(f"Weights saved to {save_path}. Download this file and put it in your local backend/weights/ folder.")

if __name__ == "__main__":
    train_model()
