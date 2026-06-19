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

# ---------------------------------------------------------------------------
# 1. ARCHITECTURE (Must exactly match local pipeline/ensemble_classifier.py)
# ---------------------------------------------------------------------------
class DeepfakeMetaClassifier(nn.Module):
    def __init__(self, input_dim=15):
        super(DeepfakeMetaClassifier, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 16),
            nn.BatchNorm1d(16),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(16, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.network(x)

# ---------------------------------------------------------------------------
# 2. SYNTHETIC OR CSV DATASET
# ---------------------------------------------------------------------------
class MetaFeaturesDataset(Dataset):
    def __init__(self, num_samples=10000):
        """
        For the Meta-Classifier, you ideally want to run the FaceForensics++ videos 
        through your local pipeline and save the 15 outputs to a CSV. 
        Then upload that CSV to Kaggle.
        
        Since we don't have that CSV here, this generates a massive synthetic 
        dataset on Kaggle for pre-training.
        """
        self.num_samples = num_samples
        
        # 0.0 = Real, 1.0 = Fake
        self.labels = np.random.randint(0, 2, size=(num_samples, 1)).astype(np.float32)
        
        # Generate 15 features
        self.features = np.zeros((num_samples, 15), dtype=np.float32)
        
        # Generate "Real" samples
        for i in range(num_samples // 2):
            features = np.clip(np.random.normal(loc=0.2, scale=0.15, size=15), 0.0, 1.0)
            if np.random.rand() < 0.1:
                features[0] = np.random.uniform(0.6, 0.9) # NN fooled
            
            self.features[i] = features
            self.labels[i] = 0.15 # Soft label for Real

        # Generate "Fake" samples
        for i in range(num_samples // 2, num_samples):
            features = np.clip(np.random.normal(loc=0.7, scale=0.2, size=15), 0.0, 1.0)
            rand_val = np.random.rand()
            if rand_val < 0.4:
                # NN thinks it's real, but sensors catch it
                features[0] = np.random.uniform(0.1, 0.4)
                sensor_to_spike = np.random.choice([3, 7, 9, 10, 11]) # geometry, rppg, eye, voice, flow
                features[sensor_to_spike] = np.random.uniform(0.7, 1.0)
            elif rand_val < 0.6:
                # Audio-only spoofing
                features = np.clip(np.random.normal(loc=0.2, scale=0.1, size=15), 0.0, 1.0)
                features[11] = np.random.uniform(0.8, 1.0)
                
            self.features[i] = features
            self.labels[i] = 0.85 # Soft label for Fake

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        return torch.FloatTensor(self.features[idx]), torch.FloatTensor(self.labels[idx])

# ---------------------------------------------------------------------------
# 3. TRAINING LOOP
# ---------------------------------------------------------------------------
def train_meta_classifier():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training Meta-Classifier on device: {device}")
    
    print("Loading dataset...")
    # NOTE: Replace MetaFeaturesDataset with a pandas CSV loader if you upload real data!
    dataset = MetaFeaturesDataset(num_samples=50000) 
    dataloader = DataLoader(dataset, batch_size=128, shuffle=True)
    
    model = DeepfakeMetaClassifier(input_dim=15).to(device)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.005)
    
    epochs = 20
    
    print("Starting Training...")
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        
        for inputs, labels in dataloader:
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            
        print(f"Epoch {epoch+1}/{epochs} | Loss: {running_loss/len(dataloader):.4f}")
            
    print("Training Complete!")
    
    # Save the weights to Kaggle's working directory so they can be downloaded
    save_path = "/kaggle/working/ensemble_mlp.pth"
    torch.save(model.state_dict(), save_path)
    print(f"Weights saved to {save_path}. Download this file and put it in your local backend/weights/ folder.")

if __name__ == "__main__":
    train_meta_classifier()
