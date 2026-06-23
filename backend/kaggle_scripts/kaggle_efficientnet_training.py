    import os
    import sys
    import subprocess
    import random

    # Auto-install missing dependencies on Kaggle
    try:
        import efficientnet_pytorch
    except ImportError:
        print("Installing efficientnet_pytorch...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "efficientnet_pytorch"])
        import efficientnet_pytorch

    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, Dataset
    import cv2
    cv2.setNumThreads(0)
    import numpy as np
    import albumentations as A
    from albumentations.pytorch import ToTensorV2
    from tqdm import tqdm
    from sklearn.model_selection import train_test_split
    import glob
    import gc
    import shutil
    import uuid

    try:
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    except NameError:
        pass

    try:
        from pipeline.models import ImprovedContrastiveFeatureExtractor
    except ImportError:
        from efficientnet_pytorch import EfficientNet

        class ChannelAttention(nn.Module):
            def __init__(self, in_planes, ratio=16):
                super().__init__()
                self.avg_pool = nn.AdaptiveAvgPool2d(1)
                self.max_pool = nn.AdaptiveMaxPool2d(1)
                self.fc1 = nn.Conv2d(in_planes, in_planes // ratio, 1, bias=False)
                self.relu1 = nn.ReLU()
                self.fc2 = nn.Conv2d(in_planes // ratio, in_planes, 1, bias=False)
                self.sigmoid = nn.Sigmoid()

            def forward(self, x):
                avg_out = self.fc2(self.relu1(self.fc1(self.avg_pool(x))))
                max_out = self.fc2(self.relu1(self.fc1(self.max_pool(x))))
                return self.sigmoid(avg_out + max_out)

        class SpatialAttention(nn.Module):
            def __init__(self, kernel_size=7):
                super().__init__()
                assert kernel_size in (3, 7)
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
                # FIX #1: Removed nested torch.amp.autocast('cuda') here.
                # The training loop already wraps forward() in autocast, so a second
                # context manager is redundant and can confuse the AMP state machine.
                x = self.efficient_net.extract_features(x)
                x = self.cbam(x)
                x = self.efficient_net._avg_pooling(x)
                x = x.flatten(start_dim=1)
                x = self.dropout(x)
                return self.classifier(x)


    # ==========================================
    # 1. Focal Loss
    # ==========================================
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


    # ==========================================
    # 2. Augmentation Pipelines
    # ==========================================
    train_transforms = A.Compose([
        A.Resize(380, 380),
        A.HorizontalFlip(p=0.5),
        A.CoarseDropout(p=0.3),
        A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ToTensorV2()
    ])

    val_transforms = A.Compose([
        A.Resize(380, 380),
        A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ToTensorV2()
    ])


    # ==========================================
    # 3. Dataset
    # ==========================================
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


    # ==========================================
    # 4. Training
    # ==========================================
    def train_model():
        EPOCHS = 20
        BATCH_SIZE = 32
        LEARNING_RATE = 1e-4
        DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {DEVICE}")

        import json

        print("--- SCANNING KAGGLE DATASETS ---")
        kaggle_input_dir = '/kaggle/input'

        fake_video_paths = []
        real_video_paths = []
        stylegan_fake_images = []
        stylegan_real_images = []

        if os.path.exists(kaggle_input_dir):
            dfdc_metadata_files = []
            for root, dirs, files in os.walk(kaggle_input_dir):
                root_lower = root.lower()
                for f in files:
                    f_lower = f.lower()
                    path = os.path.join(root, f)

                    if f_lower.endswith('.mp4') or f_lower.endswith('.avi'):
                        if 'celeb-real' in root_lower or 'youtube-real' in root_lower:
                            real_video_paths.append(path)
                        elif 'celeb-synthesis' in root_lower:
                            fake_video_paths.append(path)
                        elif 'original_sequences' in root_lower:
                            real_video_paths.append(path)
                        elif 'manipulated_sequences' in root_lower:
                            fake_video_paths.append(path)
                        elif 'wild' in root_lower:
                            if 'real' in root_lower:
                                real_video_paths.append(path)
                            elif 'fake' in root_lower:
                                fake_video_paths.append(path)

                    elif f_lower.endswith('.jpg') or f_lower.endswith('.png'):
                        if '100k-fake' in root_lower or 'stylegan' in root_lower or 'fake-face' in root_lower:
                            stylegan_fake_images.append(path)
                        elif '140k-' in root_lower:
                            if 'fake' in root_lower:
                                stylegan_fake_images.append(path)
                            elif 'real' in root_lower:
                                stylegan_real_images.append(path)

                    elif f_lower == 'metadata.json':
                        dfdc_metadata_files.append(path)

            for meta_file in dfdc_metadata_files:
                meta_dir = os.path.dirname(meta_file)
                try:
                    with open(meta_file, 'r') as f:
                        data = json.load(f)
                        for video_name, info in data.items():
                            vid_path = os.path.join(meta_dir, video_name)
                            if os.path.exists(vid_path):
                                if info.get('label') == 'REAL':
                                    real_video_paths.append(vid_path)
                                else:
                                    fake_video_paths.append(vid_path)
                except Exception:
                    pass

            print(f"Scan complete: {len(real_video_paths)} real videos, {len(fake_video_paths)} fake videos")
            print(f"              {len(stylegan_real_images)} real images, {len(stylegan_fake_images)} fake images")
        else:
            print("Not on Kaggle — using local fallback.")
            real_video_paths = glob.glob('./data/real/**/*.mp4', recursive=True)
            fake_video_paths = glob.glob('./data/fake/**/*.mp4', recursive=True)

        # -----------------------------------------------------------------------
        # FACE EXTRACTION (Saved to disk)
        # -----------------------------------------------------------------------
        def extract_from_list(video_paths, output_dir, max_frames=5, desc="Extracting"):
            os.makedirs(output_dir, exist_ok=True)
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
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
                    if not ret:
                        continue
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    faces = face_cascade.detectMultiScale(
                        gray, scaleFactor=1.1, minNeighbors=5, minSize=(100, 100)
                    )
                    for (x, y, w, h) in faces:
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

        def copy_images_to_working_dir(paths_list, output_dir, desc="Copying"):
            os.makedirs(output_dir, exist_ok=True)
            saved_paths = []
            for p in tqdm(paths_list, desc=desc):
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

        print("\n--- PREPROCESSING ---")
        # FIX: Shuffle lists to uniformly sample across ALL datasets instead of just the first one alphabetically
        random.seed(42)
        random.shuffle(fake_video_paths)
        random.shuffle(real_video_paths)
        random.shuffle(stylegan_fake_images)
        random.shuffle(stylegan_real_images)

        MAX_VIDEOS_PER_CLASS = 10000
        MAX_IMAGES_PER_CLASS = 20000

        WORK_DIR_FAKE = '/kaggle/working/extracted_faces/fake'
        WORK_DIR_REAL = '/kaggle/working/extracted_faces/real'
        
        if not os.path.exists('/kaggle/working'):
            WORK_DIR_FAKE = './extracted_faces/fake'
            WORK_DIR_REAL = './extracted_faces/real'

        fake_images = extract_from_list(fake_video_paths[:MAX_VIDEOS_PER_CLASS], WORK_DIR_FAKE, max_frames=5, desc="Fake videos")
        real_images = extract_from_list(real_video_paths[:MAX_VIDEOS_PER_CLASS], WORK_DIR_REAL, max_frames=5, desc="Real videos")

        if stylegan_fake_images:
            fake_images.extend(copy_images_to_working_dir(stylegan_fake_images[:MAX_IMAGES_PER_CLASS], WORK_DIR_FAKE, desc="Fake images"))
        if stylegan_real_images:
            real_images.extend(copy_images_to_working_dir(stylegan_real_images[:MAX_IMAGES_PER_CLASS], WORK_DIR_REAL, desc="Real images"))

        if not fake_images:
            fake_images = glob.glob('/dev/shm/extracted_faces/fake/*.jpg')
        if not real_images:
            real_images = glob.glob('/dev/shm/extracted_faces/real/*.jpg')

        if not fake_images and not real_images:
            print("ERROR: No face images found. Check your Kaggle input paths.")
            return

        print(f"Dataset: {len(fake_images)} fakes, {len(real_images)}")

        # FIX #3: Explicitly free path lists — they're large string arrays we no longer need.
        del fake_video_paths, real_video_paths, stylegan_fake_images, stylegan_real_images
        gc.collect()

        # Optional: print RAM usage as a sanity check
        try:
            import psutil
            used_gb = psutil.virtual_memory().used / 1e9
            total_gb = psutil.virtual_memory().total / 1e9
            print(f"RAM after data load: {used_gb:.1f} / {total_gb:.1f} GB")
        except ImportError:
            pass

        all_images = fake_images + real_images
        all_labels = [0] * len(fake_images) + [1] * len(real_images)

        X_train, X_val, y_train, y_val = train_test_split(
            all_images, all_labels, test_size=0.2, random_state=42
        )

        train_dataset = DeepfakeDataset(X_train, y_train, transforms=train_transforms)
        val_dataset   = DeepfakeDataset(X_val,   y_val,   transforms=val_transforms)

        # -----------------------------------------------------------------------
        # FIX #4: Data is now loaded dynamically from disk. We can safely restore
        # num_workers=4 and pin_memory=True to accelerate GPU feeding without
        # blowing up RAM with Copy-on-Write memory leaks.
        # -----------------------------------------------------------------------
        train_loader = DataLoader(
            train_dataset, batch_size=BATCH_SIZE, shuffle=True,
            num_workers=4, pin_memory=True
        )
        val_loader = DataLoader(
            val_dataset, batch_size=BATCH_SIZE, shuffle=False,
            num_workers=4, pin_memory=True
        )

        model = ImprovedContrastiveFeatureExtractor().to(DEVICE)
        torch.backends.cudnn.benchmark = True

        num_fake  = len(fake_images)
        num_real  = len(real_images)
        total     = num_fake + num_real
        wf = total / (2.0 * num_fake) if num_fake > 0 else 1.0
        wr = total / (2.0 * num_real) if num_real > 0 else 1.0
        print(f"Class weights → fake: {wf:.3f}, real: {wr:.3f}")

        criterion = FocalLoss(alpha=1, gamma=2)
        optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4)
        scaler    = torch.amp.GradScaler('cuda')
        scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=5, T_mult=2)

        # -----------------------------------------------------------------------
        # Checkpoint resume (with error handling for corrupted files)
        # -----------------------------------------------------------------------
        start_epoch     = 0
        checkpoint_path = "improved_finetuned_model_checkpoint.pth"

        if os.path.exists(checkpoint_path):
            print(f"Found checkpoint {checkpoint_path} — resuming...")
            try:
                ckpt = torch.load(checkpoint_path, map_location=DEVICE)
                state_dict = ckpt['model']
                if isinstance(model, nn.DataParallel):
                    model.module.load_state_dict(state_dict, strict=False)
                else:
                    model.load_state_dict(state_dict, strict=False)
                optimizer.load_state_dict(ckpt['optimizer'])
                scheduler.load_state_dict(ckpt['scheduler'])
                scaler.load_state_dict(ckpt['scaler'])
                start_epoch = ckpt['epoch'] + 1
                print(f"Resumed at epoch {start_epoch + 1}")
            except Exception as e:
                # FIX #5: Corrupted checkpoint (from a mid-write crash) used to kill
                # the entire restart.  Now we warn and start fresh.
                print(f"Warning: checkpoint load failed ({e}). Starting from scratch.")
                start_epoch = 0

        best_val_acc     = 0.0
        patience         = 5
        patience_counter = 0
        ACCUMULATION_STEPS = 4

        print("\n--- TRAINING ---")
        for epoch in range(start_epoch, EPOCHS):

            # Backbone warm-up / unfreezing
            base_model = model.module if isinstance(model, nn.DataParallel) else model
            if epoch < 2:
                print(f"\n[Epoch {epoch+1}/{EPOCHS}] Warm-up: backbone frozen")
                for p in base_model.efficient_net.parameters():
                    p.requires_grad = False
            elif epoch == 2:
                print(f"\n[Epoch {epoch+1}/{EPOCHS}] Full fine-tune: backbone unfrozen")
                for p in base_model.efficient_net.parameters():
                    p.requires_grad = True

            # ---- Train ----
            model.train()
            train_loss = correct_train = total_train = 0
            optimizer.zero_grad()

            loop = tqdm(train_loader, leave=True)
            for i, (images, labels) in enumerate(loop):
                images, labels = images.to(DEVICE), labels.to(DEVICE)

                use_mixup = np.random.rand() < 0.5
                if use_mixup:
                    lam     = np.random.beta(0.2, 0.2)
                    idx_mix = torch.randperm(images.size(0)).to(DEVICE)
                    images  = lam * images + (1 - lam) * images[idx_mix]
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
                    correct_train += (
                        lam * (predicted == labels_a).sum().float() +
                        (1 - lam) * (predicted == labels_b).sum().float()
                    ).item()
                else:
                    correct_train += (predicted == labels).sum().item()

                loop.set_description(f"Epoch [{epoch+1}/{EPOCHS}]")
                loop.set_postfix(
                    loss=loss.item() * ACCUMULATION_STEPS,
                    acc=100.0 * correct_train / total_train
                )

            scheduler.step()

            # ---- Validate ----
            model.eval()
            val_loss = correct_val = total_val = 0

            with torch.no_grad():
                for images, labels in val_loader:
                    images, labels = images.to(DEVICE), labels.to(DEVICE)
                    with torch.amp.autocast('cuda'):
                        outputs = model(images)
                        loss    = criterion(outputs, labels)
                    val_loss    += loss.item()
                    _, predicted = torch.max(outputs.data, 1)
                    total_val   += labels.size(0)
                    correct_val += (predicted == labels).sum().item()

            val_acc = 100.0 * correct_val / total_val
            print(f"Val loss: {val_loss/len(val_loader):.4f} | Val acc: {val_acc:.2f}%")

            # Save per-epoch checkpoint
            state_dict = (
                model.module.state_dict()
                if isinstance(model, nn.DataParallel)
                else model.state_dict()
            )
            torch.save({
                'epoch':     epoch,
                'model':     state_dict,
                'optimizer': optimizer.state_dict(),
                'scheduler': scheduler.state_dict(),
                'scaler':    scaler.state_dict(),
            }, checkpoint_path)

            if val_acc > best_val_acc:
                best_val_acc     = val_acc
                patience_counter = 0
                print(f"  ✓ New best ({best_val_acc:.2f}%) — saving improved_finetuned_model.pth")
                torch.save({'model': state_dict}, 'improved_finetuned_model.pth')
            else:
                patience_counter += 1
                print(f"  No improvement ({patience_counter}/{patience})")
                if patience_counter >= patience:
                    print("Early stopping triggered.")
                    break

            gc.collect()
            torch.cuda.empty_cache()

        print("\nTraining complete. Download 'improved_finetuned_model.pth' from Kaggle outputs.")


    if __name__ == "__main__":
        train_model()
