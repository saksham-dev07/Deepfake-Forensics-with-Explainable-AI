import torch
import numpy as np
import cv2
import os
import threading
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pipeline.image_utils import save_optimized_image

class XAIExplainer:
    def __init__(self, model):
        self.model = model
        self.device = next(model.parameters()).device
        if not hasattr(model, "_inference_lock"):
            model._inference_lock = threading.RLock()
        
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
        with self.model._inference_lock, torch.enable_grad():
            # Guided backprop must not modify the caller's gradient flags or buffer.
            tensor = input_tensor.detach().clone().to(self.device).requires_grad_(True)
            try:
                return self._generate_heatmap(tensor, original_image, save_path)
            finally:
                self.model.zero_grad(set_to_none=True)
                if self.available:
                    self.cam.activations_and_grads.clear()

    def _generate_heatmap(self, input_tensor, original_image, save_path):
        """
        Generates and saves a GradCAM heatmap and Guided Grad-CAM pixel map.
        """
        if not self.available:
            return None, None
            
        # The Kaggle model maps: Index 0 = FAKE, Index 1 = REAL
        targets = [ClassifierOutputTarget(0)] # Target class 0 (deepfake)
        
        # Generate heatmap
        grayscale_cam = self.cam(input_tensor=input_tensor, targets=targets)
        grayscale_cam = grayscale_cam[0, :]
        
        # Normalize original image to [0, 1] for show_cam_on_image
        rgb_img = np.float32(original_image) / 255
        
        # Overlay heatmap on image
        visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
        
        # Save visualization
        save_optimized_image(save_path, cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR))
        
        # Generate Guided Grad-CAM
        guided_path = None
        # The dependency mutates ReLU modules; restore originals even if backward fails.
        relus = [(parent, name, child) for parent in self.model.modules()
                 for name, child in parent.named_children() if isinstance(child, torch.nn.ReLU)]
        try:
            from pytorch_grad_cam import GuidedBackpropReLUModel
            guided_model = GuidedBackpropReLUModel(model=self.model, device=self.device)
            
            guided_input = input_tensor.detach().clone().requires_grad_(True)
            cam_gb = guided_model(guided_input, target_category=0)
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
            
            root, extension = os.path.splitext(save_path)
            candidate_path = root + "_guided" + extension
            save_optimized_image(candidate_path, guided_colored)
            guided_path = candidate_path
        except Exception as e:
            print("Failed to generate Guided Grad-CAM:", e)
        finally:
            for parent, name, original in relus:
                parent._modules[name] = original
            
        return save_path, guided_path

    def get_shap_features(self):
        """Legacy interface; measured ensemble SHAP values are generated in main.py."""
        return []
