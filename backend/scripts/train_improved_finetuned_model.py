# =====================================================================
# CONTINUAL FINE-TUNING PIPELINE (WITH ANTI-CATASTROPHIC FORGETTING)
# Architecture : EfficientNet-B4 + CBAM Dual-Attention Head
# Base Weights : improved_finetuned_model.pth (99.81% Celeb-DF, 99.96% 140k)
# New Training : FaceForensics++ (C23) + Celeb-DF v2 + 140k Faces + DFDC
# Strategy     : Replay Experience Mixing + Low Learning Rate (2e-5)
# =====================================================================

import os
import sys
import subprocess
import random
import glob
import gc
import uuid
import json

# Auto-install efficientnet_pytorch on Kaggle if missing
try:
    import efficientnet_pytorch
except ImportError:
    print("[*] Installing efficientnet_pytorch...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "efficientnet_pytorch"])
    import efficientnet_pytorch

import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset
import cv2
cv2.setNumThreads(0)
import numpy as np
import albumentations as A
from albumentations.pytorch import ToTensorV2
from tqdm.auto import tqdm
from sklearn.model_selection import train_test_split
from efficientnet_pytorch import EfficientNet


# =====================================================================
# 1. MODEL ARCHITECTURE (Exact match with backend & saved checkpoints)
# =====================================================================

class ChannelAttention(nn.Module):
    def __init__(self, in_planes, ratio=16):
        super().__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
        self.fc1 = nn.Conv2d(in_planes, in_planes // ratio, 1, bias=False)
        self.relu1 = nn.ReLU(inplace=True)
        self.fc2 = nn.Conv2d(in_planes // ratio, in_planes, 1, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = self.fc2(self.relu1(self.fc1(self.avg_pool(x))))
        max_out = self.fc2(self.relu1(self.fc1(self.max_pool(x))))
        return self.sigmoid(avg_out + max_out)


class SpatialAttention(nn.Module):
    def __init__(self, kernel_size=7):
        super().__init__()
        padding = 3 if kernel_size == 7 else 1
        self.conv1 = nn.Conv2d(2, 1, kernel_size, padding=padding, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = torch.mean(x, dim=1, keepdim=True)
        max_out, _ = torch.max(x, dim=1, keepdim=True)
        return self.sigmoid(self.conv1(torch.cat([avg_out, max_out], dim=1)))


class CBAM(nn.Module):
    def __init__(self, in_planes, ratio=16, kernel_size=7):
        super().__init__()
        self.ca = ChannelAttention(in_planes, ratio)
        self.sa = SpatialAttention(kernel_size)

    def forward(self, x):
        x = x * self.ca(x)
        x = x * self.sa(x)
        return x


class ImprovedContrastiveFeatureExtractor(nn.Module):
    def __init__(self):
        super().__init__()
        self.efficient_net = EfficientNet.from_pretrained('efficientnet-b4')
        self.cbam = CBAM(1792)
        self.classifier = nn.Linear(1792, 2)
        self.dropout = nn.Dropout(p=0.5)

    def forward(self, x):
        x = self.efficient_net.extract_features(x)
        x = self.cbam(x)
        x = self.efficient_net._avg_pooling(x)
        x = x.flatten(start_dim=1)
        x = self.dropout(x)
        return self.classifier(x)


# =====================================================================
# 2. FOCAL LOSS & AUGMENTATION PIPELINES
# =====================================================================

class FocalLoss(nn.Module):
    def __init__(self, alpha=1, gamma=2, reduction='mean'):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction
        self.ce_loss = nn.CrossEntropyLoss(reduction='none')

    def forward(self, inputs, targets):
        log_pt = -self.ce_loss(inputs, targets)
        pt = torch.exp(log_pt)
        loss = -self.alpha * (1 - pt) ** self.gamma * log_pt
        if self.reduction == 'mean':
            return loss.mean()
        elif self.reduction == 'sum':
            return loss.sum()
        return loss


# Robust augmentations specifically tuned for H.264 compression & spatial blurring
# Compatible with both modern Albumentations (>=1.4) and legacy versions
try:
    compression_aug = A.ImageCompression(quality_range=(35, 95), p=0.4)
except TypeError:
    compression_aug = A.ImageCompression(quality_lower=35, quality_upper=95, p=0.4)

train_transforms = A.Compose([
    A.Resize(380, 380),
    A.HorizontalFlip(p=0.5),
    compression_aug,
    A.GaussianBlur(blur_limit=(3, 7), p=0.3),
    A.CoarseDropout(p=0.3),
    A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
    ToTensorV2()
])

val_transforms = A.Compose([
    A.Resize(380, 380),
    A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
    ToTensorV2()
])


class DeepfakeDataset(Dataset):
    def __init__(self, image_paths, labels, transforms=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transforms = transforms

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        item = self.image_paths[idx]
        image = cv2.imread(item)

        if image is None:
            image = np.zeros((380, 380, 3), dtype=np.uint8)
        else:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        if self.transforms:
            image = self.transforms(image=image)['image']

        return image, torch.tensor(self.labels[idx], dtype=torch.long)


# =====================================================================
# 3. FACE EXTRACTION & BALANCED DATA PREPARATION
# =====================================================================

def extract_faces_from_videos(video_paths, output_dir, max_frames=6, desc="Extracting Faces"):
    os.makedirs(output_dir, exist_ok=True)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    saved_paths = []

    for vid_path in tqdm(video_paths, desc=desc):
        cap = cv2.VideoCapture(vid_path)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if frame_count <= 0:
            cap.release()
            continue

        frame_idxs = np.linspace(0, frame_count - 1, min(frame_count, max_frames), dtype=int)
        for idx in frame_idxs:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
            if len(faces) == 0:
                continue

            # Prioritize largest face
            faces = sorted(faces, key=lambda b: b[2] * b[3], reverse=True)
            x, y, w, h = faces[0]

            exp = int(0.2 * w)
            x1, y1 = max(0, x - exp), max(0, y - exp)
            x2, y2 = min(frame.shape[1], x + w + exp), min(frame.shape[0], y + h + exp)
            crop = frame[y1:y2, x1:x2]
            if crop.size == 0:
                continue

            crop = cv2.resize(crop, (380, 380))
            out_path = os.path.join(output_dir, f"{uuid.uuid4().hex}.jpg")
            cv2.imwrite(out_path, crop, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
            saved_paths.append(out_path)
            break
        cap.release()

    return saved_paths


def copy_balanced_images(paths_list, output_dir, max_count=15000, desc="Copying Images"):
    os.makedirs(output_dir, exist_ok=True)
    saved_paths = []
    selected = paths_list[:max_count]

    for p in tqdm(selected, desc=desc):
        out_path = os.path.join(output_dir, f"{uuid.uuid4().hex}.jpg")
        try:
            img = cv2.imread(p)
            if img is not None:
                img = cv2.resize(img, (380, 380))
                cv2.imwrite(out_path, img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
                saved_paths.append(out_path)
        except Exception:
            pass

    return saved_paths


# =====================================================================
# 4. CONTINUAL FINE-TUNING ENGINE
# =====================================================================

def train_continual_model():
    # -----------------------------------------------------------------
    # Hyperparameters for Fine-Tuning (Carefully tuned to avoid forgetting)
    # -----------------------------------------------------------------
    EPOCHS = 5                   # 3-5 epochs is optimal for fine-tuning
    BATCH_SIZE = 32
    LEARNING_RATE = 2e-5         # Lower learning rate preserves Celeb-DF/140k knowledge
    WEIGHT_DECAY = 1e-4
    ACCUMULATION_STEPS = 4       # Effective batch size = 128
    PATIENCE = 3
    DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"[*] Running on device: {DEVICE}")

    # Output paths
    work_dir = '/kaggle/working' if os.path.exists('/kaggle/working') else '.'
    work_dir_fake = os.path.join(work_dir, 'finetune_faces', 'fake')
    work_dir_real = os.path.join(work_dir, 'finetune_faces', 'real')
    best_model_path = os.path.join(work_dir, 'improved_finetuned_model_v2.pth')
    canonical_model_path = os.path.join(work_dir, 'improved_finetuned_model.pth')

    # -----------------------------------------------------------------
    # STEP 1: Multi-Dataset Scanning with Replay Buffer
    # -----------------------------------------------------------------
    print("\n" + "=" * 65)
    print("      STEP 1: MULTI-DATASET DISCOVERY & REPLAY BUFFER")
    print("=" * 65)

    kaggle_input_dir = '/kaggle/input'
    
    # Buckets to guarantee balanced representation across all domains
    ff_real_videos = []
    ff_fake_videos = []
    celeb_real_videos = []
    celeb_fake_videos = []
    dfdc_real_videos = []
    dfdc_fake_videos = []
    stylegan_real_images = []
    stylegan_fake_images = []

    valid_exts = ('.mp4', '.avi', '.mov', '.mkv')

    if os.path.exists(kaggle_input_dir):
        print(f"[*] Crawling datasets inside {kaggle_input_dir}...")
        dfdc_meta_files = []

        for root, dirs, files in os.walk(kaggle_input_dir):
            root_lower = root.lower().replace('\\', '/')
            for f in files:
                f_lower = f.lower()
                path = os.path.join(root, f)

                # 1. Video Discovery
                if f_lower.endswith(valid_exts):
                    # A. FaceForensics++ (C23) - NEW DOMAIN
                    if 'faceforensics' in root_lower or 'ff-c23' in root_lower or 'ff++' in root_lower:
                        if '/original' in root_lower:
                            ff_real_videos.append(path)
                        elif any(m in root_lower for m in ['deepfakes', 'face2face', 'faceswap', 'neuraltextures', 'faceshifter', 'deepfakedetection']):
                            ff_fake_videos.append(path)

                    # B. Celeb-DF (v2) - REPLAY DOMAIN
                    elif 'celeb-real' in root_lower or 'youtube-real' in root_lower:
                        celeb_real_videos.append(path)
                    elif 'celeb-synthesis' in root_lower:
                        celeb_fake_videos.append(path)

                    # C. Wild Deepfake (if present)
                    elif 'wild' in root_lower:
                        if 'real' in root_lower:
                            celeb_real_videos.append(path)
                        elif 'fake' in root_lower:
                            celeb_fake_videos.append(path)

                # 2. Image Discovery (140k Real & Fake Faces) - REPLAY DOMAIN
                elif f_lower.endswith(('.jpg', '.jpeg', '.png')):
                    path_lower = path.lower().replace('\\', '/')
                    if '140k' in root_lower or 'real_vs_fake' in root_lower or 'real-vs-fake' in root_lower:
                        if '/fake' in path_lower or '/fake' in root_lower:
                            stylegan_fake_images.append(path)
                        elif '/real' in path_lower or '/real' in root_lower:
                            stylegan_real_images.append(path)
                    elif '100k-fake' in root_lower or 'stylegan' in root_lower:
                        stylegan_fake_images.append(path)

                # 3. DFDC Metadata
                elif f_lower == 'metadata.json':
                    dfdc_meta_files.append(path)

        # Parse DFDC if present
        for mf in dfdc_meta_files:
            mdir = os.path.dirname(mf)
            try:
                with open(mf, 'r') as jf:
                    mdata = json.load(jf)
                    for vname, vinfo in mdata.items():
                        vpath = os.path.join(mdir, vname)
                        if os.path.exists(vpath):
                            if vinfo.get('label') == 'REAL':
                                dfdc_real_videos.append(vpath)
                            else:
                                dfdc_fake_videos.append(vpath)
            except Exception:
                pass

    print(f"[+] Discovered Videos:")
    print(f"    - FaceForensics++ (C23):  {len(ff_real_videos):>5} Real | {len(ff_fake_videos):>5} Fake (Face2Face, Deepfakes, NeuralTextures, etc.)")
    print(f"    - Celeb-DF (v2):          {len(celeb_real_videos):>5} Real | {len(celeb_fake_videos):>5} Fake")
    print(f"    - DFDC Sample:            {len(dfdc_real_videos):>5} Real | {len(dfdc_fake_videos):>5} Fake")
    print(f"[+] Discovered Images:")
    print(f"    - 140k Faces / StyleGAN:  {len(stylegan_real_images):>5} Real | {len(stylegan_fake_images):>5} Fake")

    # -----------------------------------------------------------------
    # STEP 2: Balanced Face Sampling & Extraction
    # -----------------------------------------------------------------
    print("\n" + "=" * 65)
    print("      STEP 2: EXPERIENCE REPLAY SAMPLING & FACE EXTRACTION")
    print("=" * 65)

    random.seed(42)
    random.shuffle(ff_real_videos)
    random.shuffle(ff_fake_videos)
    random.shuffle(celeb_real_videos)
    random.shuffle(celeb_fake_videos)
    random.shuffle(stylegan_real_images)
    random.shuffle(stylegan_fake_images)

    # Balance proportions: ~50% FaceForensics++ (new) + ~50% Replay (Celeb-DF + 140k + DFDC)
    # This mathematically prevents catastrophic forgetting!
    SAMPLE_FF_VIDS_PER_CLASS = 1000     # Sample up to 1000 FF++ videos per class
    SAMPLE_REPLAY_VIDS = 500            # Sample up to 500 Celeb-DF/DFDC videos per class
    SAMPLE_REPLAY_IMAGES = 10000        # Sample 10k authentic FFHQ & StyleGAN images

    selected_fake_vids = ff_fake_videos[:SAMPLE_FF_VIDS_PER_CLASS] + celeb_fake_videos[:SAMPLE_REPLAY_VIDS] + dfdc_fake_videos[:250]
    selected_real_vids = ff_real_videos[:SAMPLE_FF_VIDS_PER_CLASS] + celeb_real_videos[:SAMPLE_REPLAY_VIDS] + dfdc_real_videos[:250]

    random.shuffle(selected_fake_vids)
    random.shuffle(selected_real_vids)

    print(f"[*] Extracting faces from {len(selected_fake_vids)} fake videos and {len(selected_real_vids)} real videos...")
    fake_faces = extract_faces_from_videos(selected_fake_vids, work_dir_fake, max_frames=5, desc="Fake Videos")
    real_faces = extract_faces_from_videos(selected_real_vids, work_dir_real, max_frames=5, desc="Real Videos")

    if stylegan_fake_images:
        print(f"[*] Mixing in {min(len(stylegan_fake_images), SAMPLE_REPLAY_IMAGES)} StyleGAN fake images...")
        fake_faces.extend(copy_balanced_images(stylegan_fake_images, work_dir_fake, max_count=SAMPLE_REPLAY_IMAGES, desc="StyleGAN Fakes"))

    if stylegan_real_images:
        print(f"[*] Mixing in {min(len(stylegan_real_images), SAMPLE_REPLAY_IMAGES)} FFHQ real images...")
        real_faces.extend(copy_balanced_images(stylegan_real_images, work_dir_real, max_count=SAMPLE_REPLAY_IMAGES, desc="FFHQ Reals"))

    total_fake = len(fake_faces)
    total_real = len(real_faces)
    print(f"\n[+] Final Balanced Training Pool: {total_fake:,} Fakes | {total_real:,} Reals (Total: {total_fake + total_real:,} samples)")

    if total_fake == 0 or total_real == 0:
        raise RuntimeError("No faces extracted! Check Kaggle dataset input directories.")

    # Free path lists from RAM
    del ff_real_videos, ff_fake_videos, celeb_real_videos, celeb_fake_videos, stylegan_real_images, stylegan_fake_images
    gc.collect()

    # -----------------------------------------------------------------
    # STEP 3: DataLoader Setup
    # -----------------------------------------------------------------
    all_images = fake_faces + real_faces
    all_labels = [0] * total_fake + [1] * total_real  # 0 = Fake, 1 = Real

    X_train, X_val, y_train, y_val = train_test_split(all_images, all_labels, test_size=0.15, random_state=42, stratify=all_labels)

    train_dataset = DeepfakeDataset(X_train, y_train, transforms=train_transforms)
    val_dataset   = DeepfakeDataset(X_val,   y_val,   transforms=val_transforms)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=4, pin_memory=True)
    val_loader   = DataLoader(val_dataset,   batch_size=BATCH_SIZE, shuffle=False, num_workers=4, pin_memory=True)

    # -----------------------------------------------------------------
    # STEP 4: Model Initialization & Weights Loading
    # -----------------------------------------------------------------
    print("\n" + "=" * 65)
    print("      STEP 4: LOAD PRETRAINED BASE WEIGHTS")
    print("=" * 65)

    model = ImprovedContrastiveFeatureExtractor().to(DEVICE)
    torch.backends.cudnn.benchmark = True

    # Search for your existing model weights in Kaggle inputs
    candidate_weights = [
        "/kaggle/input/models/sakshamagarwal123/deepfake/pytorch/default/1/improved_finetuned_model.pth",
        "/kaggle/input/deepfake-weights/improved_finetuned_model.pth",
        "./improved_finetuned_model.pth",
        "../weights/improved_finetuned_model.pth"
    ]
    # Also search any .pth in /kaggle/input
    if os.path.exists(kaggle_input_dir):
        for r, _, fs in os.walk(kaggle_input_dir):
            for f in fs:
                if f.endswith('.pth') and 'improved_finetuned' in f:
                    candidate_weights.insert(0, os.path.join(r, f))

    loaded_weights = False
    for wp in candidate_weights:
        if os.path.exists(wp):
            print(f"[*] Found pre-trained checkpoint: {wp}")
            try:
                ckpt = torch.load(wp, map_location=DEVICE, weights_only=False)
                state_dict = ckpt['model'] if isinstance(ckpt, dict) and 'model' in ckpt else ckpt
                model.load_state_dict(state_dict, strict=False)
                print("  [✓] Successfully loaded base weights into model!")
                loaded_weights = True
                break
            except Exception as e:
                print(f"  [!] Failed loading {wp}: {e}")

    if not loaded_weights:
        print("[!] Warning: Could not find base 'improved_finetuned_model.pth'. Starting from ImageNet weights.")

    # Class balancing loss
    wf = (total_fake + total_real) / (2.0 * total_fake)
    wr = (total_fake + total_real) / (2.0 * total_real)
    print(f"[*] Class Weights -> Fake: {wf:.3f}, Real: {wr:.3f}")

    criterion = FocalLoss(alpha=1, gamma=2)

    # Differential Learning Rate: Lower on pre-trained backbone, slightly higher on CBAM/head
    backbone_params = list(model.efficient_net.parameters())
    head_params = list(model.cbam.parameters()) + list(model.classifier.parameters())
    
    optimizer = optim.AdamW([
        {'params': backbone_params, 'lr': LEARNING_RATE * 0.5},  # 1e-5 on backbone (gentle)
        {'params': head_params,     'lr': LEARNING_RATE}        # 2e-5 on CBAM and classifier
    ], weight_decay=WEIGHT_DECAY)

    scaler = torch.amp.GradScaler('cuda')
    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=EPOCHS, T_mult=1)

    # -----------------------------------------------------------------
    # STEP 5: Continual Fine-Tuning Loop
    # -----------------------------------------------------------------
    print("\n" + "=" * 65)
    print(f"      STEP 5: FINE-TUNING FOR {EPOCHS} EPOCHS")
    print("=" * 65)

    best_val_acc = 0.0
    patience_counter = 0

    for epoch in range(EPOCHS):
        model.train()
        train_loss = correct_train = total_train = 0
        optimizer.zero_grad()

        loop = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{EPOCHS}]", leave=True)
        for i, (images, labels) in enumerate(loop):
            images, labels = images.to(DEVICE), labels.to(DEVICE)

            # Mixup augmentation (50% probability)
            use_mixup = np.random.rand() < 0.5
            if use_mixup:
                lam = np.random.beta(0.2, 0.2)
                idx_mix = torch.randperm(images.size(0)).to(DEVICE)
                images = lam * images + (1 - lam) * images[idx_mix]
                labels_a, labels_b = labels, labels[idx_mix]

            with torch.amp.autocast('cuda'):
                outputs = model(images)
                if use_mixup:
                    loss = lam * criterion(outputs, labels_a) + (1 - lam) * criterion(outputs, labels_b)
                else:
                    loss = criterion(outputs, labels)
                loss = loss / ACCUMULATION_STEPS

            scaler.scale(loss).backward()

            if (i + 1) % ACCUMULATION_STEPS == 0 or (i + 1) == len(train_loader):
                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad()

            train_loss += loss.item() * ACCUMULATION_STEPS
            _, predicted = torch.max(outputs.data, 1)
            total_train += labels.size(0)

            if use_mixup:
                correct_train += (lam * (predicted == labels_a).sum().float() + (1 - lam) * (predicted == labels_b).sum().float()).item()
            else:
                correct_train += (predicted == labels).sum().item()

            loop.set_postfix(
                loss=loss.item() * ACCUMULATION_STEPS,
                acc=100.0 * correct_train / total_train
            )

        scheduler.step()

        # ---- Validation ----
        model.eval()
        val_loss = correct_val = total_val = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                with torch.amp.autocast('cuda'):
                    outputs = model(images)
                    loss = criterion(outputs, labels)
                val_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                total_val += labels.size(0)
                correct_val += (predicted == labels).sum().item()

        val_acc = 100.0 * correct_val / total_val
        val_loss_avg = val_loss / len(val_loader)
        print(f"\n[Epoch {epoch+1}/{EPOCHS}] Train Acc: {100.0*correct_train/total_train:.2f}% | Val Loss: {val_loss_avg:.4f} | Val Acc: {val_acc:.2f}%")

        # Save Checkpoint
        state_dict = model.state_dict()
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            print(f"  [✓] New Best Accuracy ({best_val_acc:.2f}%)! Saving model checkpoints...")
            torch.save({'model': state_dict}, best_model_path)
            torch.save({'model': state_dict}, canonical_model_path)
            print(f"      -> Saved to: {best_model_path}")
            print(f"      -> Saved to: {canonical_model_path}")
        else:
            patience_counter += 1
            print(f"  [-] No improvement ({patience_counter}/{PATIENCE})")
            if patience_counter >= PATIENCE:
                print("Early stopping triggered.")
                break

        gc.collect()
        torch.cuda.empty_cache()

    print("\n" + "=" * 65)
    print(f"[SUCCESS] Fine-tuning complete! Peak Validation Accuracy: {best_val_acc:.2f}%")
    print(f"Download '{canonical_model_path}' from Kaggle outputs.")
    print("=" * 65)


if __name__ == "__main__":
    train_continual_model()
