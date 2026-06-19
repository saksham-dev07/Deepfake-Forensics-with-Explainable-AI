import os
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from torch.utils.data import TensorDataset, DataLoader

class DeepfakeMetaClassifier(nn.Module):
    def __init__(self, input_dim=15):
        super(DeepfakeMetaClassifier, self).__init__()
        # 3-layer MLP
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
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.to(self.device)
        self.is_trained = False

    def forward(self, x):
        return self.network(x)

    def generate_synthetic_dataset(self, num_samples=5000):
        """
        Procedurally generate realistic anomaly score distributions for Real (0) and Fake (1) videos.
        Features: 
        0: nn_score
        1: spectral_score
        2: ela_score
        3: geometry_anomaly
        4: noise_score
        5: color_score
        6: sync_score
        7: metadata_score
        8: rppg_score
        9: lighting_score
        10: eye_score
        11: voice_score
        12: flow_score
        13: cfa_score
        14: corneal_score
        """
        np.random.seed(42)
        X = []
        y = []

        # Generate "Real" samples
        for _ in range(num_samples // 2):
            # Real samples generally have low anomaly scores (mostly 0.1 to 0.4)
            features = np.clip(np.random.normal(loc=0.2, scale=0.15, size=15), 0.0, 1.0)
            
            # Occasionally the Neural Network might be fooled (false positive), but physical sensors will stay low
            if np.random.rand() < 0.1:
                features[0] = np.random.uniform(0.6, 0.9) # NN fooled
                
            X.append(features)
            y.append(0.15) # Real (Soft Label)

        # Generate "Fake" samples
        for _ in range(num_samples // 2):
            # Fake samples: The NN might catch it, or it might be a highly realistic deepfake
            features = np.clip(np.random.normal(loc=0.7, scale=0.2, size=15), 0.0, 1.0)
            
            rand_val = np.random.rand()
            if rand_val < 0.4:
                # Highly realistic deepfake: NN is fooled (predicts real < 0.4), but physical/biological sensors catch it
                features[0] = np.random.uniform(0.1, 0.4) # NN thinks it's real
                # Make sure at least one biological/physical sensor catches it
                sensor_to_spike = np.random.choice([3, 7, 9, 10, 11]) # geometry, rppg, eye, voice, flow
                features[sensor_to_spike] = np.random.uniform(0.7, 1.0)
            elif rand_val < 0.6:
                # Audio-only spoofing (face is real, but voice is fake)
                features = np.clip(np.random.normal(loc=0.2, scale=0.1, size=15), 0.0, 1.0) # Everything looks real
                features[11] = np.random.uniform(0.8, 1.0) # Voice score is completely anomalous
            
            X.append(features)
            y.append(0.85) # Fake (Soft Label)

        X = torch.FloatTensor(np.array(X))
        y = torch.FloatTensor(np.array(y)).unsqueeze(1)
        return TensorDataset(X, y)

    def train_model(self, epochs=50, batch_size=32, save_path="weights/ensemble_mlp.pth"):
        print("Initializing synthetic dataset for Ensemble Meta-Classifier training...")
        dataset = self.generate_synthetic_dataset()
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        
        criterion = nn.BCELoss()
        optimizer = optim.Adam(self.parameters(), lr=0.01)
        
        self.train()
        print(f"Training Meta-Classifier for {epochs} epochs on {self.device}...")
        for epoch in range(epochs):
            total_loss = 0
            for batch_X, batch_y in dataloader:
                batch_X, batch_y = batch_X.to(self.device), batch_y.to(self.device)
                
                optimizer.zero_grad()
                predictions = self(batch_X)
                loss = criterion(predictions, batch_y)
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
                
            if (epoch + 1) % 5 == 0:
                print(f"Epoch [{epoch+1}/{epochs}], Loss: {total_loss/len(dataloader):.4f}")
        
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        torch.save(self.state_dict(), save_path)
        self.is_trained = True
        print(f"Meta-Classifier training complete. Weights saved to {save_path}")

    def load_model(self, model_path="weights/ensemble_mlp.pth"):
        if os.path.exists(model_path):
            self.load_state_dict(torch.load(model_path, map_location=self.device, weights_only=True))
            self.eval()
            self.is_trained = True
            print(f"Loaded pre-trained Meta-Classifier from {model_path}")
            return True
        else:
            print(f"Meta-Classifier weights not found at {model_path}. Please train first.")
            return False

    def predict(self, feature_dict):
        """
        Predict final deepfake confidence from a dictionary of scores.
        """
        if not self.is_trained:
            # Fallback to simple mean if not trained
            return sum(feature_dict.values()) / len(feature_dict)
            
        self.eval()
        
        # Order matters! Must match generate_synthetic_dataset
        feature_order = [
            "nn_score", "spectral_score", "ela_score", "geometry_anomaly", 
            "noise_score", "color_score", "sync_score", "metadata_score", "rppg_score", 
            "lighting_score", "eye_score", "voice_score", "flow_score", 
            "cfa_score", "corneal_score"
        ]
        
        x_vector = [feature_dict.get(key, 0.5) for key in feature_order]
        x_tensor = torch.FloatTensor([x_vector]).to(self.device)
        
        with torch.no_grad():
            output = self(x_tensor)
            confidence = output.item()
            
        return confidence

if __name__ == "__main__":
    # Test/Train script
    classifier = DeepfakeMetaClassifier()
    classifier.train_model()
    
    # Test a prediction
    test_features = {
        "nn_score": 0.2, "spectral_score": 0.3, "ela_score": 0.2, "geometry_anomaly": 0.9, 
        "noise_score": 0.2, "color_score": 0.3, "sync_score": 0.5, "metadata_score": 0.1, "rppg_score": 0.9, 
        "lighting_score": 0.2, "eye_score": 0.8, "voice_score": 0.5, "flow_score": 0.2, 
        "cfa_score": 0.2, "corneal_score": 0.2
    }
    
    prob = classifier.predict(test_features)
    print(f"Test Prediction (Highly Realistic Deepfake with bad geometry/rppg): {prob:.4f}")
