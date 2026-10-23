import os
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from torch.utils.data import TensorDataset, DataLoader

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
    FEATURE_ORDER = (
        "nn_score", "spectral_score", "ela_score", "geometry_anomaly",
        "noise_score", "color_score", "sync_score", "metadata_score", "rppg_score",
        "lighting_score", "eye_score", "voice_score", "flow_score", "cfa_score", "corneal_score",
    )

    def __init__(self, input_dim=15):
        super(DeepfakeMetaClassifier, self).__init__()
        # Advanced Tabular ResNet + Self-Attention
        self.network = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            ResidualBlock(64),
            SelfAttention(64), # Legacy single-token projection; preserve checkpoint layout.
            ResidualBlock(64),
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.to(self.device)
        self.is_trained = False
        
        self.use_xgboost = True
        self.xgb_model = None
        self.is_xgb_trained = False
        try:
            import xgboost as xgb
            self.xgb_model = xgb.XGBClassifier(
                n_estimators=200, 
                learning_rate=0.05, 
                max_depth=5, 
                subsample=0.8, 
                colsample_bytree=0.8,
                eval_metric='logloss'
            )
        except ImportError:
            print("Warning: xgboost not installed. Falling back to PyTorch Tabular ResNet.")
            self.use_xgboost = False

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
        rng = np.random.RandomState(42)
        X = []
        y = []

        # Generate "Real" samples
        for _ in range(num_samples // 2):
            features = np.clip(rng.normal(loc=0.2, scale=0.15, size=15), 0.0, 1.0)
            
            rand_val = rng.rand()
            if rand_val < 0.1:
                # 1. NN is fooled (false positive), but physical sensors stay low
                features[0] = rng.uniform(0.6, 0.9) # NN fooled
            elif rand_val < 0.3:
                # 2. NN knows it's Real, but physical heuristics throw FALSE POSITIVES
                # (e.g. Corneal reflection fails because of glasses, Geometry fails because of motion blur)
                features[0] = rng.uniform(0.05, 0.35)
                # Spike 1 or 2 physical sensors to simulate real-world false positives
                false_positive_sensors = rng.choice(range(1, 15), size=2, replace=False)
                features[false_positive_sensors[0]] = rng.uniform(0.6, 0.95)
                if rng.rand() < 0.5:
                    features[false_positive_sensors[1]] = rng.uniform(0.5, 0.8)
                
            # Randomize metadata_score (7) to prevent it from becoming a shortcut
            features[7] = rng.uniform(0.0, 1.0)
            X.append(features)
            y.append(0.15) # Real (Soft Label)

        # Generate "Fake" samples
        for _ in range(num_samples // 2):
            rand_val = rng.rand()
            
            if rand_val < 0.3:
                # 1. Standard Low-Quality Deepfake (Everything is highly anomalous)
                features = np.clip(rng.normal(loc=0.7, scale=0.2, size=15), 0.0, 1.0)
                
            elif rand_val < 0.6:
                # 2. Highly realistic pure-generative (Midjourney/Sora)
                # NN might be fooled, but pure synthetic signals (CFA, Noise, Spectral) catch it
                features = np.clip(rng.normal(loc=0.2, scale=0.1, size=15), 0.0, 1.0)
                features[0] = rng.uniform(0.1, 0.4) # NN thinks it's real
                features[4] = rng.uniform(0.7, 1.0) # Noise
                features[13] = rng.uniform(0.7, 1.0) # CFA
                features[1] = rng.uniform(0.7, 1.0) # Spectral
                
            elif rand_val < 0.75:
                # 3. High-Quality Face Swap (Celeb-DF) -> CRITICAL FIX!
                # Global background is completely authentic (CFA, Noise, Lighting = low)
                # But NN catches the swapped face, and Geometry/Face sensors catch it
                features = np.clip(rng.normal(loc=0.15, scale=0.1, size=15), 0.0, 1.0)
                features[0] = rng.uniform(0.6, 1.0) # NN successfully catches the face
                
                # Make sure at least one face-specific physical sensor catches the swap boundary
                sensor_to_spike = rng.choice([2, 3, 10, 14]) # ELA, Geometry, Eye, Corneal
                features[sensor_to_spike] = rng.uniform(0.6, 1.0)
                
            elif rand_val < 0.9:
                # 4. Neural Network is FOOLED, but biological sensors catch the flaw!
                # (e.g. Corneal mismatch is 80% or Geometry is anomalous, even though NN outputs 30%)
                features = np.clip(rng.normal(loc=0.15, scale=0.1, size=15), 0.0, 1.0)
                features[0] = rng.uniform(0.1, 0.4) # NN thinks it's completely real!
                
                # At least two biological/face sensors catch it
                sensors_to_spike = rng.choice([2, 3, 10, 14], size=2, replace=False)
                features[sensors_to_spike[0]] = rng.uniform(0.7, 1.0)
                features[sensors_to_spike[1]] = rng.uniform(0.5, 0.9)
                
            else:
                # 5. Audio-only spoofing (face is completely real, but voice/sync is fake)
                features = np.clip(rng.normal(loc=0.2, scale=0.1, size=15), 0.0, 1.0)
                features[11] = rng.uniform(0.8, 1.0) # Voice score anomalous
                features[6] = rng.uniform(0.7, 1.0) # Sync score anomalous
            
            # Randomize metadata_score (7) to prevent it from becoming a shortcut
            features[7] = rng.uniform(0.0, 1.0)
            X.append(features)
            y.append(0.85) # Fake (Soft Label)

        return np.array(X), np.array(y)

    def train_model(self, epochs=50, batch_size=64, save_path=None):
        """
        Train the Meta-Classifier on the procedurally generated dataset.
        Trains both the PyTorch Tabular ResNet and XGBoost models.
        """
        if save_path is None:
            save_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "ensemble_mlp.pth")
        print("Generating synthetic meta-dataset for training...")
        X, y = self.generate_synthetic_dataset(num_samples=10000)
        
        # 1. Train XGBoost Model
        if self.use_xgboost:
            print("Training XGBoost Meta-Classifier...")
            y_binary = np.array([1 if val > 0.5 else 0 for val in y])
            self.xgb_model.fit(X, y_binary)
            self.is_xgb_trained = True
            xgb_save_path = save_path.replace(".pth", "_xgb.json")
            os.makedirs(os.path.dirname(xgb_save_path), exist_ok=True)
            self.xgb_model.save_model(xgb_save_path)
            print(f"XGBoost training complete. Weights saved to {xgb_save_path}")

        # 2. Train PyTorch Model
        X_tensor = torch.FloatTensor(X)
        y_tensor = torch.FloatTensor(y).unsqueeze(1)
        dataset = TensorDataset(X_tensor, y_tensor)
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        
        criterion = nn.BCELoss()
        optimizer = optim.Adam(self.parameters(), lr=0.01)
        
        self.train()
        print(f"Training Tabular ResNet for {epochs} epochs on {self.device}...")
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

    def load_model(self, model_path=None):
        if model_path is None:
            model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "ensemble_mlp.pth")
            
        self.is_trained = False
        self.is_xgb_trained = False
        # Attempt to load XGBoost first if available
        if self.use_xgboost:
            xgb_save_path = model_path.replace(".pth", "_xgb.json")
            if os.path.exists(xgb_save_path):
                try:
                    self.xgb_model.load_model(xgb_save_path)
                    self.is_xgb_trained = True
                    self.is_trained = True
                    print(f"Loaded XGBoost Meta-Classifier from {xgb_save_path}")
                    return True
                except Exception as error:
                    print(f"XGBoost checkpoint unavailable; trying PyTorch: {error}")

        if os.path.exists(model_path):
            state_dict = torch.load(model_path, map_location=self.device, weights_only=True)
            
            # Check if this is the legacy 3-layer MLP (V1) or the new Tabular ResNet (V2)
            is_legacy = "network.0.weight" in state_dict and state_dict["network.0.weight"].shape[0] == 32
            
            if is_legacy:
                print(f"Detected Legacy V1 Meta-Classifier weights at {model_path}. Downgrading architecture on the fly...")
                self.network = nn.Sequential(
                    nn.Linear(15, 32),
                    nn.BatchNorm1d(32),
                    nn.ReLU(),
                    nn.Dropout(0.2),
                    nn.Linear(32, 16),
                    nn.BatchNorm1d(16),
                    nn.ReLU(),
                    nn.Dropout(0.2),
                    nn.Linear(16, 1),
                    nn.Sigmoid()
                ).to(self.device)
            else:
                print(f"Detected Advanced V2 Meta-Classifier weights at {model_path}. Using Tabular ResNet with Self-Attention!")
                
            self.load_state_dict(state_dict)
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
        x_vector = [feature_dict.get(key, 0.5) for key in self.FEATURE_ORDER]
        return float(self.predict_batch([x_vector])[0])

    def predict_batch(self, features):
        """Shared inference gateway for production and SHAP, in FEATURE_ORDER."""
        values = np.asarray(features, dtype=np.float32)
        if values.ndim != 2 or values.shape[1] != len(self.FEATURE_ORDER) or not np.isfinite(values).all():
            raise ValueError("Expected finite batches with 15 features in FEATURE_ORDER")
        if np.any((values < 0) | (values > 1)):
            raise ValueError("Anomaly features must be in [0, 1]")
        if values.shape[0] == 0:
            return np.empty(0, dtype=np.float32)
        if self.use_xgboost and self.is_xgb_trained:
            predictions = np.asarray(self.xgb_model.predict_proba(values)[:, 1])
        elif not self.is_trained:
            raise RuntimeError("A trained meta-classifier checkpoint is required for fusion")
        else:
            self.eval()
            x_tensor = torch.as_tensor(values, device=self.device)
            with torch.no_grad():
                predictions = self(x_tensor).cpu().numpy().reshape(-1)
        if predictions.shape != (len(values),) or not np.isfinite(predictions).all() or np.any((predictions < 0) | (predictions > 1)):
            raise ValueError("Meta-classifier returned invalid anomaly scores")
        return predictions

if __name__ == "__main__":
    # Validate existing weights; training is an explicit operation.
    classifier = DeepfakeMetaClassifier()
    if not classifier.load_model():
        raise RuntimeError("No trained meta-classifier checkpoint found")
    
    # Test a prediction
    test_features = {
        "nn_score": 0.2, "spectral_score": 0.3, "ela_score": 0.2, "geometry_anomaly": 0.9, 
        "noise_score": 0.2, "color_score": 0.3, "sync_score": 0.5, "metadata_score": 0.1, "rppg_score": 0.9, 
        "lighting_score": 0.2, "eye_score": 0.8, "voice_score": 0.5, "flow_score": 0.2, 
        "cfa_score": 0.2, "corneal_score": 0.2
    }
    
    prob = classifier.predict(test_features)
    print(f"Test Prediction (Highly Realistic Deepfake with bad geometry/rppg): {prob:.4f}")
