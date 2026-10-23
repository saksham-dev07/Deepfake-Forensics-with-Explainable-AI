"""Inspect unsigned EXIF/container declarations; this is not provenance validation."""
import os
import exifread
import subprocess


def analyze_metadata(file_path):
    """Return metadata observations and a legacy, uncalibrated keyword heuristic.

    Missing tags and ordinary editing tools do not establish manipulation. A
    generator keyword is an unsigned declaration, not an authenticated origin.
    """
    results = {
        "metadata_anomaly_score": 0.5,
        "available": False,
        "metadata_available": False,
        "score_kind": "heuristic",
        "score_calibrated": False,
        "provenance_authenticated": False,
        "declared_generator": False,
        "extracted_tags": {},
        "warnings": [],
        "is_stripped": False,
    }
    generators = ("midjourney", "dall-e", "stable diffusion", "runway", "comfyui")
    editors = ("adobe", "photoshop", "gimp", "lightroom")

    def inspect_tag(key, value):
        value = str(value)
        results["extracted_tags"][key] = value
        key_lower, value_lower = key.lower(), value.lower()
        if any(token in key_lower for token in ("software", "encoder", "tool")):
            if any(token in value_lower for token in generators):
                results["declared_generator"] = True
                results["metadata_anomaly_score"] = 0.95
                results["available"] = True
                results["warnings"].append(f"Unsigned generator declaration: {value}. This is editable metadata, not authenticated provenance.")
            elif any(token in value_lower for token in editors):
                results["warnings"].append(f"Editing software declared: {value}. Routine editing alone is not evidence of a deepfake.")
        if "datetime" in key_lower or key_lower == "creation_time":
            # Epoch dates can be ordinary defaults; never turn them into a verdict.
            if value.startswith(("0000", "1970")):
                results["warnings"].append(f"Unset or default timestamp: {value}. This does not establish manipulation.")

    if not os.path.isfile(file_path):
        results["error"] = "File not found"
        return results

    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext in (".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"):
            with open(file_path, "rb") as source:
                tags = exifread.process_file(source, details=False)
            for key, value in tags.items():
                if key not in ("JPEGThumbnail", "TIFFThumbnail", "Filename", "EXIF MakerNote") and any(
                    token in key for token in ("Software", "Make", "Model", "DateTime", "ColorSpace", "ImageWidth", "ImageLength")
                ):
                    inspect_tag(key, value)
            results["metadata_available"] = bool(tags)
        elif ext in (".mp4", ".avi", ".mov", ".mkv", ".webm"):
            import imageio_ffmpeg
            process = subprocess.run(
                [imageio_ffmpeg.get_ffmpeg_exe(), "-i", file_path, "-hide_banner"],
                capture_output=True, text=True, timeout=30,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            output = process.stderr
            # `ffmpeg -i` exits nonzero with no output specified even after a
            # successful probe, so require its parsed Input header instead.
            if not any(line.lstrip().startswith("Input #") for line in output.splitlines()):
                raise ValueError("FFmpeg could not read the media container")
            in_metadata = False
            for line in output.splitlines():
                if line.strip() == "Metadata:":
                    in_metadata = True
                    continue
                if in_metadata and not line.startswith("    "):
                    in_metadata = False
                if in_metadata and ":" in line:
                    key, value = line.strip().split(":", 1)
                    inspect_tag(key.strip(), value.strip())
            results["metadata_available"] = bool(results["extracted_tags"])
        else:
            results["warnings"].append("Metadata extraction is unsupported for this file format.")
            return results
    except Exception as exc:
        results["available"] = False
        results["metadata_anomaly_score"] = 0.5
        results["warnings"].append(f"Metadata extraction failed: {exc}")
        return results

    if not results["metadata_available"]:
        # Retain legacy field name: absence does not prove the tags were stripped.
        results["is_stripped"] = True
        results["warnings"].append("No supported metadata found. Tags may never have existed, may be unsupported, or may have been removed during ordinary sharing; absence is not evidence of AI generation.")
    elif not results["declared_generator"]:
        results["warnings"].append("Metadata observations do not establish authentic or synthetic origin; no authenticated provenance is checked.")
    return results
