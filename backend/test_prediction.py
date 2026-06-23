import torch
from pipeline.ensemble_classifier import DeepfakeMetaClassifier
import os

model_path = "weights/ensemble_mlp.pth"
classifier = DeepfakeMetaClassifier()
if os.path.exists(model_path):
    classifier.load_model(model_path)
else:
    print("WARNING: ensemble_mlp.pth not found in weights/")
    
test_features = {
    'nn_score': 0.6692380821332335, 
    'spectral_score': 0.17252, 
    'ela_score': 0.2354, 
    'geometry_anomaly': 0.7268, 
    'noise_score': 0.1, 
    'color_score': 0.15, 
    'metadata_score': 0.7, 
    'rppg_score': 0.15, 
    'lighting_score': 0.1, 
    'eye_score': 0.1, 
    'voice_score': 0.5, 
    'flow_score': 0.1, 
    'cfa_score': 0.28278139492929666, 
    'corneal_score': 0.1, 
    'sync_score': 0.5
}

prob = classifier.predict(test_features)
print(f"\nFinal Predicted Probability: {prob * 100:.2f}%")
