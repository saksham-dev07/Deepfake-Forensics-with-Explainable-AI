from efficientnet_pytorch import EfficientNet
import torch
import torch.nn as nn
import threading
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
            weights_candidates = [
                os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "improved_finetuned_model_v2.pth"),
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "improved_finetuned_model_v2.pth"),
                os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "improved_finetuned_model.pth")
            ]
            weights_path = None
            for p in weights_candidates:
                if os.path.exists(p):
                    weights_path = p
                    break
            
            if weights_path is not None:
                print(f"Loading EfficientNet-B4 + CBAM visual backbone from {os.path.basename(weights_path)}...")
                self.model = ImprovedContrastiveFeatureExtractor()
                ckpt = torch.load(weights_path, map_location='cpu', weights_only=True)
                
                if 'model' in ckpt:
                    self.model.load_state_dict(ckpt['model'], strict=True)
                else:
                    self.model.load_state_dict(ckpt, strict=True)
                    
                print(f"Visual backbone ({os.path.basename(weights_path)}) loaded successfully!")
                # Add target layer for GradCAM to use with XAI Explainer
                self.model.conv_head = self.model.efficient_net._conv_head
            else:
                raise FileNotFoundError(f"Neither improved_finetuned_model_v2.pth nor improved_finetuned_model.pth found in weights directory.")

            self.model._inference_lock = threading.RLock()
            self.model.eval()
            self.model.to(self.device)
            
        except Exception as e:
            raise RuntimeError("Unable to load trained visual detector weights; analysis cannot proceed.") from e

    def predict(self, tensor_images):
        """
        ImageNet-normalized floating RGB batch [B, 3, H, W].
        Returns the checkpoint's uncalibrated class-0 softmax score.
        """
        if (not isinstance(tensor_images, torch.Tensor) or tensor_images.ndim != 4
                or tensor_images.shape[0] == 0 or tensor_images.shape[1] != 3
                or min(tensor_images.shape[2:]) == 0 or not tensor_images.is_floating_point()
                or not torch.isfinite(tensor_images).all()):
            raise ValueError("Expected a nonempty finite normalized floating RGB batch")
        tensor_images = tensor_images.to(self.device)
        
        with self.model._inference_lock, torch.no_grad():
            outputs = self.model(tensor_images)
            if outputs.shape != (tensor_images.shape[0], 2) or not torch.isfinite(outputs).all():
                raise ValueError("Visual checkpoint must return two finite logits per image")
            # Checkpoint label contract: Index 0 = FAKE, Index 1 = REAL.
            probs = torch.nn.functional.softmax(outputs, dim=1)[:, 0]
                
        return probs.cpu().numpy()

