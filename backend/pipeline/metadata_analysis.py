import os
import exifread

def analyze_metadata(file_path):
    """
    Analyzes EXIF and file metadata to detect anomalies common in deepfakes,
    such as missing EXIF data or signatures of generative AI / manipulation tools.
    """
    results = {
        "metadata_anomaly_score": 0.0,
        "extracted_tags": {},
        "warnings": [],
        "is_stripped": False
    }

    suspicious_software = ["adobe", "photoshop", "midjourney", "dall-e", "stable diffusion", "gimp", "lightroom", "runway", "comfyui"]

    if not os.path.exists(file_path):
        results["error"] = "File not found"
        return results

    ext = os.path.splitext(file_path)[1].lower()
    if ext in ['.jpg', '.jpeg', '.png', '.tiff', '.webp']:
        try:
            with open(file_path, 'rb') as f:
                tags = exifread.process_file(f, details=False)
            
            if not tags:
                # If tags is completely empty, it might be stripped
                results["is_stripped"] = True
                results["warnings"].append("No EXIF metadata found. Generative AI or social media platforms often strip EXIF data.")
                results["metadata_anomaly_score"] += 0.4
            else:
                for tag in tags.keys():
                    if tag not in ('JPEGThumbnail', 'TIFFThumbnail', 'Filename', 'EXIF MakerNote'):
                        val = str(tags[tag])
                        # Check software tags
                        if "Software" in tag or "ProcessingSoftware" in tag:
                            results["extracted_tags"][tag] = val
                            val_lower = val.lower()
                            for sus in suspicious_software:
                                if sus in val_lower:
                                    results["warnings"].append(f"Manipulation software signature found: {val}")
                                    if sus in ["midjourney", "dall-e", "stable diffusion", "runway", "comfyui"]:
                                        results["metadata_anomaly_score"] = 0.95
                                    else:
                                        results["metadata_anomaly_score"] = max(results["metadata_anomaly_score"], 0.6)
                        
                        # Collect other basic tags for the UI (like camera make/model)
                        if any(kw in tag for kw in ["Make", "Model", "DateTime", "ColorSpace", "ImageWidth", "ImageLength", "LensModel"]):
                            results["extracted_tags"][tag] = val

            # Check for pure zero dates or default dates often used by AI tools
            if "Image DateTime" in tags:
                dt = str(tags["Image DateTime"])
                if dt.startswith("0000:") or "1970" in dt:
                    results["warnings"].append(f"Suspicious timestamp: {dt}")
                    results["metadata_anomaly_score"] = max(results["metadata_anomaly_score"], 0.5)

        except Exception as e:
            results["warnings"].append(f"Error reading EXIF: {str(e)}")

    elif ext in ['.mp4', '.avi', '.mov', '.mkv']:
        results["warnings"].append("Advanced video metadata analysis skipped. EXIF mostly applies to images.")
        # Minimal penalty for video
        results["metadata_anomaly_score"] = 0.1
        
    return results
