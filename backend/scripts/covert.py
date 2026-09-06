import os
import torch

# 1. Path to your extracted directory containing the model files
dir_path = "backend\improved_finetuned_model_v2.zip"
output_pth = "improved_finetuned_model_v2.pth"

# 2. Load the state dictionary or model structure stored in the folder
try:
    # PyTorch 1.6+ supports loading directly from saved model directories
    state_dict = torch.load(dir_path, map_location="cpu")
    
    # 3. Save as a standard single .pth file
    torch.save(state_dict, output_pth)
    print(f"Successfully converted and saved model to {output_pth}")

except Exception as e:
    print(f"Error loading model directory: {e}")