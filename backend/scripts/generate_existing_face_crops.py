import os
import sys
import cv2

# Set path to backend
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)

from pipeline.face_geometry import detect_face

def crop_from_bbox(img_rgb, bbox):
    if bbox is None:
        fh, fw = img_rgb.shape[:2]
        min_dim = min(fh, fw)
        y1, x1 = (fh - min_dim) // 2, (fw - min_dim) // 2
        return img_rgb[y1:y1+min_dim, x1:x1+min_dim]
    x, y, w, h = bbox
    exp = int(0.2 * w)
    x1, y1 = max(0, int(x - exp)), max(0, int(y - exp))
    x2, y2 = min(img_rgb.shape[1], int(x + w + exp)), min(img_rgb.shape[0], int(y + h + exp))
    return img_rgb[y1:y2, x1:x2]

uploads_dir = os.path.join(backend_dir, "uploads")
count = 0
if os.path.exists(uploads_dir):
    for d in os.listdir(uploads_dir):
        full_d = os.path.join(uploads_dir, d)
        if os.path.isdir(full_d) and d.endswith("_frames"):
            frame_file = os.path.join(full_d, "frame_0000.jpg")
            face_crop_file = os.path.join(full_d, "face_crop.jpg")
            if os.path.exists(frame_file) and not os.path.exists(face_crop_file):
                frame = cv2.imread(frame_file)
                if frame is not None:
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    bbox = None
                    try:
                        res = detect_face(frame_rgb)
                        if res and "face_bbox" in res:
                            bbox = res["face_bbox"]
                    except Exception as e:
                        print(f"Face detect err in {d}: {e}")
                    cropped = crop_from_bbox(frame_rgb, bbox)
                    resized = cv2.resize(cropped, (380, 380))
                    cv2.imwrite(face_crop_file, cv2.cvtColor(resized, cv2.COLOR_RGB2BGR))
                    count += 1
                    print(f"Generated face_crop.jpg for {d}")

print(f"Total face crops generated: {count}")
