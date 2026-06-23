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

class ChannelAttention(nn.Module):
    def __init__(self, in_planes, ratio=16):
        super(ChannelAttention, self).__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
        self.fc1   = nn.Conv2d(in_planes, in_planes // ratio, 1, bias=False)
        self.relu1 = nn.ReLU()
        self.fc2   = nn.Conv2d(in_planes // ratio, in_planes, 1, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = self.fc2(self.relu1(self.fc1(self.avg_pool(x))))
        max_out = self.fc2(self.relu1(self.fc1(self.max_pool(x))))
        out = avg_out + max_out
        return self.sigmoid(out)

class SpatialAttention(nn.Module):
    def __init__(self, kernel_size=7):
        super(SpatialAttention, self).__init__()
        assert kernel_size in (3, 7), 'kernel size must be 3 or 7'
        padding = 3 if kernel_size == 7 else 1
        self.conv1 = nn.Conv2d(2, 1, kernel_size, padding=padding, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = torch.mean(x, dim=1, keepdim=True)
        max_out, _ = torch.max(x, dim=1, keepdim=True)
        x = torch.cat([avg_out, max_out], dim=1)
        x = self.conv1(x)
        return self.sigmoid(x)

class CBAM(nn.Module):
    def __init__(self, in_planes, ratio=16, kernel_size=7):
        super(CBAM, self).__init__()
        self.ca = ChannelAttention(in_planes, ratio)
        self.sa = SpatialAttention(kernel_size)

    def forward(self, x):
        x = x * self.ca(x)
        x = x * self.sa(x)
        return x

class ImprovedContrastiveFeatureExtractor(nn.Module):
    """
    Upgraded architecture combining EfficientNet-B4 with CBAM attention.
    It extracts spatial features [B, 1792, H, W], passes them through Channel 
    and Spatial attention mechanisms, and then pools them for final classification.
    """
    def __init__(self):
        super().__init__()
        self.efficient_net = EfficientNet.from_name('efficientnet-b4')
        self.cbam = CBAM(1792)
        self.classifier = nn.Linear(1792, 2)
        self.dropout = nn.Dropout(p=0.5)
        
    def forward(self, x):
        # Extract spatial features [B, 1792, H, W]
        x = self.efficient_net.extract_features(x)
        
        # Apply CBAM spatial/channel attention
        x = self.cbam(x)
        
        # Global Average Pooling
        x = self.efficient_net._avg_pooling(x)
        x = x.flatten(start_dim=1)
        x = self.dropout(x)
        
        # Final classification
        return self.classifier(x)

class DeepfakeDetector:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        print("Loading custom EfficientNet-B4 deepfake detector architecture...")
        try:
            improved_finetuned_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "improved_finetuned_model.pth")
            finetuned_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "finetuned_model.pth")
            
            if os.path.exists(improved_finetuned_path):
                print("Found V2 weights! Loading ImprovedContrastiveFeatureExtractor (with CBAM Attention)...")
                self.model = ImprovedContrastiveFeatureExtractor()
                ckpt = torch.load(improved_finetuned_path, map_location='cpu', weights_only=False)
                
                if 'model' in ckpt:
                    self.model.load_state_dict(ckpt['model'], strict=False)
                else:
                    self.model.load_state_dict(ckpt, strict=False)
                    
                print("Improved Finetuned model loaded successfully!")
                # Add target layer for GradCAM to use with XAI Explainer
                self.model.conv_head = self.model.efficient_net._conv_head
                
            elif os.path.exists(finetuned_path):
                print("Loading V1 LOCAL finetuned weights from weights/finetuned_model.pth...")
                self.model = ContrastiveFeatureExtractor()
                ckpt = torch.load(finetuned_path, map_location='cpu', weights_only=False)
                
                if 'model' in ckpt:
                    self.model.load_state_dict(ckpt['model'], strict=False)
                else:
                    self.model.load_state_dict(ckpt, strict=False)
                    
                print("V1 Finetuned model loaded successfully!")
                # Add target layer for GradCAM to use with XAI Explainer
                self.model.conv_head = self.model.global_feature_extractor.efficient_net._conv_head
                
            else:
                raise FileNotFoundError("Could not find any finetuned_model.pth in the weights folder. Please train and download your model.")

            self.model.eval()
            self.model.to(self.device)
            
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
