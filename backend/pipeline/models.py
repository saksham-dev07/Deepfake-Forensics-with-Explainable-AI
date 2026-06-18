from efficientnet_pytorch import EfficientNet
import torch
import torch.nn as nn
import huggingface_hub
import os

# Base architecture for the custom EfficientNet-B4 model
class ContrastiveFeatureExtractor(nn.Module):
    def __init__(self):
        super().__init__()
        class GlobalFeatureExtractor(nn.Module):
            def __init__(self):
                super().__init__()
                self.efficient_net = EfficientNet.from_name('efficientnet-b4')
                # Remove the final FC layer as per the custom model architecture
                self.efficient_net._fc = nn.Identity()
                
        self.global_feature_extractor = GlobalFeatureExtractor()
        # The checkpoint has classifier.weight of size [2, 1792]
        self.classifier = nn.Linear(1792, 2)
        
    def forward(self, x):
        features = self.global_feature_extractor.efficient_net(x)
        return self.classifier(features)

class DeepfakeDetector:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        print("Loading custom EfficientNet-B4 deepfake detector architecture...")
        try:
            self.model = ContrastiveFeatureExtractor()
            
            # Check for local finetuned weights first
            finetuned_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "finetuned_model.pth")
            if os.path.exists(finetuned_path):
                print("Loading LOCAL finetuned weights from weights/finetuned_model.pth...")
                ckpt = torch.load(finetuned_path, map_location='cpu', weights_only=False)
                # Handle possible differences in save format (entire state dict vs nested dict)
                if 'model' in ckpt:
                    self.model.load_state_dict(ckpt['model'], strict=False)
                else:
                    self.model.load_state_dict(ckpt, strict=False)
                print("Finetuned model loaded successfully!")
            else:
                raise FileNotFoundError("Could not find finetuned_model.pth in the weights folder. Please train and download your model.")

            self.model.eval()
            self.model.to(self.device)
            
            # Add target layer for GradCAM to use with XAI Explainer
            # In efficientnet_pytorch, the last convolutional layer is typically _conv_head
            self.model.conv_head = self.model.global_feature_extractor.efficient_net._conv_head
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Warning: Could not load the nikokons model ({e}).")
            print("Falling back to standard timm EfficientNet-B4.")
            import timm
            self.model = timm.create_model('tf_efficientnet_b4_ns', pretrained=True, num_classes=2)
            self.model.eval()
            self.model.to(self.device)

    def predict(self, tensor_images):
        """
        tensor_images: A batch of images [B, C, H, W] in range [0, 1]
        Returns probability of being a deepfake
        """
        tensor_images = tensor_images.to(self.device)
        
        with torch.no_grad():
            outputs = self.model(tensor_images)
            # Assuming output is logits for [real, fake] or a single logit
            if outputs.shape[1] == 2:
                # The fine-tuned model maps: Index 0 = FAKE, Index 1 = REAL
                probs = torch.nn.functional.softmax(outputs, dim=1)[:, 0]
            else:
                probs = torch.sigmoid(outputs)
                
        return probs.cpu().numpy()

# Mock SyncNet for Audio/Video Sync as we need the specific weights file
class SyncNetAnalyzer:
    def __init__(self, weights_path="weights/syncnet_v2.model"):
        import os
        self.weights_path = weights_path
        if not os.path.exists(weights_path):
            print(f"Warning: SyncNet weights not found at {weights_path}.")
            print("Please download 'syncnet_v2.model' from Rudrabha/Wav2Lip Google Drive and place it there.")
            self.available = False
        else:
            self.available = True
            # Load the model here (mocked for now, as Wav2Lip SyncNet architecture requires specific classes)
            
    def analyze_sync(self, frames_dir, audio_path):
        if not self.available:
            return 0.5 # Return a neutral score if unavailable
            
        # In a full implementation, we would extract audio mfcc via librosa,
        # crop faces from frames, and feed both into SyncNet to get sync error.
        return 0.5 # Return neutral score since the full heavy model is not currently bundled
