"""
Kaggle Training Script for AI Meta-Classifier
Upload this script to a Kaggle Notebook and run it.
"""

import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# ---------------------------------------------------------------------------
# 1. ARCHITECTURE (Must exactly match local pipeline/ensemble_classifier.py)
# ---------------------------------------------------------------------------
class ResidualBlock(nn.Module):
    def __init__(self, dim):
        super(ResidualBlock, self).__init__()
        self.fc = nn.Sequential(
            nn.Linear(dim, dim),
            nn.BatchNorm1d(dim),
            nn.ReLU(),
            nn.Dropout(0.2)
        )
    def forward(self, x):
        return x + self.fc(x)

class SelfAttention(nn.Module):
    def __init__(self, dim):
        super(SelfAttention, self).__init__()
        self.query = nn.Linear(dim, dim)
        self.key = nn.Linear(dim, dim)
        self.value = nn.Linear(dim, dim)
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x):
        x_reshaped = x.unsqueeze(1) # [B, 1, Dim]
        q = self.query(x_reshaped)
        k = self.key(x_reshaped)
        v = self.value(x_reshaped)
        
        scores = torch.bmm(q, k.transpose(1, 2)) / (x.size(-1) ** 0.5)
        attn = self.softmax(scores)
        out = torch.bmm(attn, v).squeeze(1)
        return out + x # Residual connection

class DeepfakeMetaClassifier(nn.Module):
    def __init__(self, input_dim=15):
        super(DeepfakeMetaClassifier, self).__init__()
        # Advanced Tabular ResNet + Self-Attention
        self.network = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            ResidualBlock(64),
            SelfAttention(64), # Dynamic Sensor Weighing
            ResidualBlock(64),
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.network(x)

# ---------------------------------------------------------------------------
# 2. DATASET (CSV or Synthetically Procedural)
# ---------------------------------------------------------------------------
class MetaFeaturesDataset(Dataset):
    def __init__(self, csv_path=None, num_samples=100000):
        """
        Loads from a CSV if provided. Otherwise, generates a synthetic dataset
        that mirrors the failure states (e.g. Celeb-DF) of the neural networks.
        """
        self.features = []
        self.labels = []
        
        if csv_path and os.path.exists(csv_path):
            print(f"Loading data from CSV: {csv_path}")
            df = pd.read_csv(csv_path)
            # Assuming last column is label (0=Real, 1=Fake) and first 15 are features
            self.features = df.iloc[:, :15].values.astype(np.float32)
            self.labels = df.iloc[:, -1].values.astype(np.float32).reshape(-1, 1)
        else:
            print("No CSV found or provided. Generating advanced synthetic dataset...")
            self.generate_synthetic(num_samples)
            
    def generate_synthetic(self, num_samples):
        np.random.seed(42)
        X = []
        y = []

        # Generate "Real" samples
        for _ in range(num_samples // 2):
            features = np.clip(np.random.normal(loc=0.2, scale=0.15, size=15), 0.0, 1.0)
            
            rand_val = np.random.rand()
            if rand_val < 0.1:
                # 1. NN is fooled (false positive), but physical sensors stay low
                features[0] = np.random.uniform(0.6, 0.9) # NN fooled
            elif rand_val < 0.3:
                # 2. NN knows it's Real, but physical heuristics throw FALSE POSITIVES
                features[0] = np.random.uniform(0.05, 0.35)
                false_positive_sensors = np.random.choice(range(1, 15), size=2, replace=False)
                features[false_positive_sensors[0]] = np.random.uniform(0.6, 0.95)
                if np.random.rand() < 0.5:
                    features[false_positive_sensors[1]] = np.random.uniform(0.5, 0.8)
                
            # Randomize metadata_score (7) to prevent it from becoming a shortcut
            features[7] = np.random.uniform(0.0, 1.0)
            X.append(features)
            y.append([0.15]) # Real (Soft Label)

        # Generate "Fake" samples
        for _ in range(num_samples - (num_samples // 2)):
            rand_val = np.random.rand()
            
            if rand_val < 0.3:
                # 1. Standard Low-Quality Deepfake (Everything is highly anomalous)
                features = np.clip(np.random.normal(loc=0.7, scale=0.2, size=15), 0.0, 1.0)
                
            elif rand_val < 0.6:
                # 2. Highly realistic pure-generative (Midjourney/Sora)
                features = np.clip(np.random.normal(loc=0.2, scale=0.1, size=15), 0.0, 1.0)
                features[0] = np.random.uniform(0.1, 0.4) # NN thinks it's real
                features[4] = np.random.uniform(0.7, 1.0) # Noise
                features[13] = np.random.uniform(0.7, 1.0) # CFA
                features[1] = np.random.uniform(0.7, 1.0) # Spectral
                
            elif rand_val < 0.75:
                # 3. High-Quality Face Swap (Celeb-DF) -> CRITICAL FIX
                features = np.clip(np.random.normal(loc=0.15, scale=0.1, size=15), 0.0, 1.0)
                features[0] = np.random.uniform(0.6, 1.0) # NN successfully catches the face
                
                sensor_to_spike = np.random.choice([2, 3, 10, 14]) # ELA, Geometry, Eye, Corneal
                features[sensor_to_spike] = np.random.uniform(0.6, 1.0)
                
            elif rand_val < 0.9:
                # 4. Neural Network is FOOLED, but biological sensors catch the flaw!
                features = np.clip(np.random.normal(loc=0.15, scale=0.1, size=15), 0.0, 1.0)
                features[0] = np.random.uniform(0.1, 0.4) # NN thinks it's completely real!
                
                sensors_to_spike = np.random.choice([2, 3, 10, 14], size=2, replace=False)
                features[sensors_to_spike[0]] = np.random.uniform(0.7, 1.0)
                features[sensors_to_spike[1]] = np.random.uniform(0.5, 0.9)
                
            else:
                # 5. Audio-only spoofing (face is completely real, but voice/sync is fake)
                features = np.clip(np.random.normal(loc=0.1, scale=0.1, size=15), 0.0, 1.0)
                features[6] = np.random.uniform(0.7, 1.0) # Sync
                features[11] = np.random.uniform(0.7, 1.0) # Voice

            # Randomize metadata_score (7) to prevent it from becoming a shortcut
            features[7] = np.random.uniform(0.0, 1.0)
            X.append(features)
            y.append([0.85]) # Fake (Soft Label)
            
        self.features = np.array(X, dtype=np.float32)
        self.labels = np.array(y, dtype=np.float32)

    def __len__(self):
        return len(self.features)

    def __getitem__(self, idx):
        return torch.FloatTensor(self.features[idx]), torch.FloatTensor(self.labels[idx])

# ---------------------------------------------------------------------------
# 3. ADVANCED TRAINING LOOP & PLOTTING
# ---------------------------------------------------------------------------
class TabularFocalLoss(nn.Module):
    def __init__(self, alpha=0.25, gamma=2.0):
        super(TabularFocalLoss, self).__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.bce = nn.BCELoss(reduction='none')

    def forward(self, inputs, targets):
        bce_loss = self.bce(inputs, targets)
        pt = torch.exp(-bce_loss)
        focal_loss = self.alpha * (1 - pt) ** self.gamma * bce_loss
        return focal_loss.mean()

def plot_training_history(train_losses, val_losses, val_accs):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
    
    ax1.plot(train_losses, label='Train Loss')
    ax1.plot(val_losses, label='Validation Loss')
    ax1.set_title('Loss Over Time')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Loss')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    ax2.plot(val_accs, label='Validation Accuracy', color='green')
    ax2.set_title('Validation Accuracy Over Time')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Accuracy (%)')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('training_history.png')
    print("Training plot saved to 'training_history.png'")
    try:
        plt.show()
    except Exception:
        pass

def train_meta_classifier(csv_path=None):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training Meta-Classifier on device: {device}")
    
    full_dataset = MetaFeaturesDataset(csv_path=csv_path, num_samples=100000) 
    
    # 80/20 Train/Val Split
    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(full_dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=256, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=256, shuffle=False)
    
    model = DeepfakeMetaClassifier(input_dim=15).to(device)
    
    # Replaced BCELoss with Tabular Focal Loss to handle hard/trick examples!
    criterion = TabularFocalLoss(alpha=0.75, gamma=2.0)
    optimizer = optim.AdamW(model.parameters(), lr=0.005, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=3)
    
    epochs = 50
    best_val_loss = float('inf')
    patience = 10
    patience_counter = 0
    
    history = {'train_loss': [], 'val_loss': [], 'val_acc': []}
    save_path = "/kaggle/working/ensemble_mlp.pth" if os.path.exists("/kaggle/working") else "ensemble_mlp.pth"
    
    print("Starting Training...")
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            
        # Validation
        model.eval()
        val_loss = 0.0
        correct = 0
        total = 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                
                # Accuracy
                preds = (outputs > 0.5).float()
                # Assuming soft labels, we threshold labels at 0.5 for accuracy calculation
                binary_labels = (labels > 0.5).float()
                correct += (preds == binary_labels).sum().item()
                total += labels.size(0)
                
        avg_train_loss = train_loss / len(train_loader)
        avg_val_loss = val_loss / len(val_loader)
        val_acc = 100 * correct / total
        
        history['train_loss'].append(avg_train_loss)
        history['val_loss'].append(avg_val_loss)
        history['val_acc'].append(val_acc)
        
        print(f"Epoch {epoch+1:02d}/{epochs} | Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | Val Acc: {val_acc:.2f}%")
        
        scheduler.step(avg_val_loss)
        
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            patience_counter = 0
            torch.save(model.state_dict(), save_path)
            print("  --> Saved new best model!")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"Early stopping triggered after {epoch+1} epochs!")
                break
            
    print("Training Complete!")
    print(f"Best weights saved to {save_path}. Download this file and put it in your local backend/weights/ folder.")
    
    # Generate Plots
    plot_training_history(history['train_loss'], history['val_loss'], history['val_acc'])

if __name__ == "__main__":
    # You can change this path to point to a Kaggle dataset e.g., '/kaggle/input/my-deepfake-data/dataset.csv'
    train_meta_classifier(csv_path=None)
