import os
import cv2

def optimize_all_uploads():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    uploads_dir = os.path.join(base_dir, "uploads")
    if not os.path.exists(uploads_dir):
        print(f"Directory {uploads_dir} does not exist.")
        return

    total_before = 0
    total_after = 0
    count = 0

    for root, dirs, files in os.walk(uploads_dir):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in ['.jpg', '.jpeg', '.png', '.webp']:
                file_path = os.path.join(root, file)
                try:
                    size_before = os.path.getsize(file_path)
                    total_before += size_before
                    
                    # Read image
                    img = cv2.imread(file_path)
                    if img is None:
                        total_after += size_before
                        continue
                        
                    h, w = img.shape[:2]
                    # Don't resize if already small, but downsample if > 720
                    max_dim = 720
                    if max(h, w) > max_dim:
                        scale = max_dim / float(max(h, w))
                        new_w = max(1, int(w * scale))
                        new_h = max(1, int(h * scale))
                        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

                    # Optimize re-encode
                    if ext in ['.jpg', '.jpeg']:
                        cv2.imwrite(file_path, img, [
                            int(cv2.IMWRITE_JPEG_QUALITY), 80,
                            int(cv2.IMWRITE_JPEG_OPTIMIZE), 1
                        ])
                    elif ext == '.png':
                        # Convert large forensic PNGs to highly compressed PNG
                        cv2.imwrite(file_path, img, [int(cv2.IMWRITE_PNG_COMPRESSION), 9])
                    elif ext == '.webp':
                        cv2.imwrite(file_path, img, [int(cv2.IMWRITE_WEBP_QUALITY), 80])

                    size_after = os.path.getsize(file_path)
                    total_after += size_after
                    count += 1
                except Exception as e:
                    print(f"Error optimizing {file_path}: {e}")

    saved_mb = (total_before - total_after) / (1024 * 1024)
    pct = ((total_before - total_after) / total_before * 100) if total_before > 0 else 0
    print(f"Optimized {count} images.")
    print(f"Before: {total_before / (1024 * 1024):.2f} MB")
    print(f"After:  {total_after / (1024 * 1024):.2f} MB")
    print(f"Saved:  {saved_mb:.2f} MB ({pct:.1f}% reduction)")

if __name__ == "__main__":
    optimize_all_uploads()
