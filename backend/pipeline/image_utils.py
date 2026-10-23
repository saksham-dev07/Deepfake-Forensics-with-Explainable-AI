import os
import cv2
import io
import threading
import numpy as np

_figure_lock = threading.RLock()

def save_optimized_image(path: str, img, max_dim: int = 720, quality: int = 80):
    """
    Saves an image optimized for web transmission on bandwidth-constrained hosts
    (such as Hugging Face Spaces free tier).
    - Downscales images larger than max_dim (720px) using high-quality area interpolation.
    - Encodes with optimized JPEG compression (quality 80).
    - Actual file size depends on image content.
    """
    if img is None or not isinstance(img, np.ndarray) or img.ndim not in (2, 3) or img.size == 0:
        raise ValueError("Image must be a nonempty array")
    if max_dim <= 0:
        raise ValueError("max_dim must be positive")
    path = os.fspath(path)
    
    # Ensure directory exists
    dir_name = os.path.dirname(path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    
    # Downsample if dimension exceeds max_dim
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        img_resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    else:
        img_resized = img

    ext = os.path.splitext(path)[1].lower()
    if ext in ['.jpg', '.jpeg']:
        success = cv2.imwrite(path, img_resized, [
            int(cv2.IMWRITE_JPEG_QUALITY), quality,
            int(cv2.IMWRITE_JPEG_OPTIMIZE), 1
        ])
    elif ext == '.png':
        success = cv2.imwrite(path, img_resized, [int(cv2.IMWRITE_PNG_COMPRESSION), 7])
    elif ext == '.webp':
        success = cv2.imwrite(path, img_resized, [int(cv2.IMWRITE_WEBP_QUALITY), quality])
    else:
        success = cv2.imwrite(path, img_resized)

    if not success:
        raise OSError(f"Could not save image: {path}")
    return path


def save_optimized_figure(path, figure, dpi=120):
    """Render a private Figure under a lock, then use the shared image encoder."""
    with _figure_lock, io.BytesIO() as buffer:
        figure.tight_layout()
        figure.savefig(buffer, format='png', dpi=dpi, bbox_inches='tight', facecolor=figure.get_facecolor())
        image = cv2.imdecode(np.frombuffer(buffer.getvalue(), dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    return save_optimized_image(path, image)
