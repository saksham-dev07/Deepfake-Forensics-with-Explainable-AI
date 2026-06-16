import torch
import numpy as np
import cv2
import os
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

class XAIExplainer:
    def __init__(self, model):
        self.model = model
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Identify the target layer for GradCAM based on the model architecture
        # For EfficientNet, the last convolutional layer is usually appropriate.
        try:
            # Assuming timm EfficientNet
            self.target_layers = [self.model.conv_head]
            self.cam = GradCAM(model=self.model, target_layers=self.target_layers)
            self.available = True
        except AttributeError:
            print("Warning: Could not automatically find the target layer for GradCAM.")
            self.available = False
            
    def generate_heatmap(self, input_tensor, original_image, save_path):
        """
        Generates and saves a GradCAM heatmap and Guided Grad-CAM pixel map.
        """
        if not self.available:
            return None, None
            
        targets = [ClassifierOutputTarget(1)] # Target class 1 (deepfake)
        
        # Generate heatmap
        grayscale_cam = self.cam(input_tensor=input_tensor, targets=targets)
        grayscale_cam = grayscale_cam[0, :]
        
        # Normalize original image to [0, 1] for show_cam_on_image
        rgb_img = np.float32(original_image) / 255
        
        # Overlay heatmap on image
        visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
        
        # Save visualization
        cv2.imwrite(save_path, cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR))
        
        # Generate Guided Grad-CAM
        guided_path = None
        try:
            from pytorch_grad_cam import GuidedBackpropReLUModel
            guided_model = GuidedBackpropReLUModel(model=self.model, device=self.device)
            
            cam_gb = guided_model(input_tensor, target_category=1)
            # Element-wise multiply the GradCAM mask with the guided backprop to get Guided Grad-CAM
            guided_gradcam = np.multiply(cam_gb, np.expand_dims(grayscale_cam, axis=-1))
            
            # Convert to absolute gradient magnitude (single channel)
            grad_magnitude = np.mean(np.abs(guided_gradcam), axis=-1)
            
            # Percentile-based contrast stretching for high dynamic range
            p_low, p_high = np.percentile(grad_magnitude, [1, 99])
            if p_high - p_low > 1e-8:
                grad_magnitude = np.clip((grad_magnitude - p_low) / (p_high - p_low), 0, 1)
            else:
                grad_magnitude = grad_magnitude / (np.max(grad_magnitude) + 1e-7)
            
            # Apply a scientific colormap for rich visualization
            grad_uint8 = np.uint8(255 * grad_magnitude)
            guided_colored = cv2.applyColorMap(grad_uint8, cv2.COLORMAP_INFERNO)
            
            guided_path = save_path.replace(".jpg", "_guided.jpg")
            cv2.imwrite(guided_path, guided_colored)
        except Exception as e:
            print("Failed to generate Guided Grad-CAM:", e)
            
        return save_path, guided_path

    def get_shap_features(self):
        # In a real implementation, SHAP requires a background dataset and can be very slow
        # We simulate feature ranking based on regions commonly identified
        return ["Mouth region blending anomalies", "Inconsistent lighting on left cheek", "Micro-desynchronization in syllables"]
