import os
import exifread
import subprocess
import re

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
        # Advanced Video Metadata Analysis using FFMpeg
        try:
            import imageio_ffmpeg
            ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
            
            # Run ffmpeg -i and capture stderr (where ffmpeg prints metadata)
            process = subprocess.run(
                [ffmpeg_path, "-i", file_path, "-hide_banner"],
                capture_output=True,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            output = process.stderr
            
            # Parse the metadata block
            in_metadata = False
            for line in output.split('\n'):
                if "Metadata:" in line:
                    in_metadata = True
                    continue
                if in_metadata and not line.startswith("    "):
                    in_metadata = False
                    
                if in_metadata:
                    parts = line.split(":", 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        val = parts[1].strip()
                        results["extracted_tags"][key] = val
                        
                        val_lower = val.lower()
                        # Check software tags (encoders)
                        if key in ["encoder", "software", "tool"]:
                            for sus in suspicious_software + ["lavf", "ffmpeg"]:
                                if sus in val_lower:
                                    results["warnings"].append(f"Suspicious video encoder/software found: {val}")
                                    results["metadata_anomaly_score"] = max(results["metadata_anomaly_score"], 0.7)
                        
                        # Check suspicious creation dates
                        if key in ["creation_time"]:
                            if val.startswith("0000") or "1970" in val:
                                results["warnings"].append(f"Suspicious video timestamp: {val}")
                                results["metadata_anomaly_score"] = max(results["metadata_anomaly_score"], 0.6)
                                
            if not results["extracted_tags"]:
                results["is_stripped"] = True
                results["warnings"].append("No metadata found in video. It may have been stripped by an AI generator or social media platform.")
                results["metadata_anomaly_score"] += 0.3
                
        except Exception as e:
            results["warnings"].append(f"Failed to extract video metadata: {str(e)}")
            results["metadata_anomaly_score"] = 0.1

    return results
