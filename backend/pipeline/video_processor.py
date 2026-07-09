import cv2
import os
import subprocess
import imageio_ffmpeg

MAX_DURATION_SEC = 60
NUM_FRAMES = 16

def process_video(video_path: str, job_id: str):
    """
    Extracts up to 16 evenly spaced frames and audio from the video.
    If the video is longer than 60 seconds, it will be capped at 60 seconds.
    Returns the path to the directory containing the frames and the path to the audio file.
    """
    frames_dir = f"uploads/{job_id}_frames"
    os.makedirs(frames_dir, exist_ok=True)
    
    # Get reliable ffmpeg path
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    audio_path = f"uploads/{job_id}.wav"
    
    # Check if it's an image
    file_extension = video_path.split('.')[-1].lower()
    if file_extension in ['jpg', 'jpeg', 'png']:
        frame_path = os.path.join(frames_dir, "frame_0000.jpg")
        img = cv2.imread(video_path)
        if img is not None:
            cv2.imwrite(frame_path, img)
            return frames_dir, None
        else:
            raise ValueError("Could not read image file.")

    # Get video duration
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if total_frames == 0 or fps == 0:
        cap.release()
        raise ValueError("Video has no frames or could not be read.")
        
    duration = total_frames / fps
    if duration > MAX_DURATION_SEC:
        duration = MAX_DURATION_SEC
        total_frames = int(duration * fps)
        
    cap.release()

    # 1. Extract Audio using FFmpeg directly (much faster than moviepy)
    try:
        subprocess.run(
            [ffmpeg_exe, '-y', '-i', video_path, '-t', str(MAX_DURATION_SEC), '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', audio_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            audio_path = None
    except Exception as e:
        # Ffmpeg returns an error if the video has no audio track. We can safely ignore this.
        audio_path = None # Audio extraction failed or video is silent

    # 2. Extract 16 Frames using PySceneDetect & FFmpeg
    try:
        from scenedetect import detect, ContentDetector
        print(f"Running Scene Detection on {video_path}...")
        scene_list = detect(video_path, ContentDetector(threshold=27.0))
        
        frame_indices = []
        if scene_list and len(scene_list) > 0:
            frames_per_scene = max(1, NUM_FRAMES // len(scene_list))
            for scene in scene_list:
                start_frame = scene[0].get_frames()
                end_frame = scene[1].get_frames()
                
                if start_frame >= total_frames:
                    break
                end_frame = min(end_frame, total_frames)
                
                step = max(1, (end_frame - start_frame) // (frames_per_scene + 1))
                for i in range(1, frames_per_scene + 1):
                    idx = start_frame + (step * i)
                    if idx < total_frames and len(frame_indices) < NUM_FRAMES:
                        frame_indices.append(idx)
                        
            if len(frame_indices) < NUM_FRAMES:
                needed = NUM_FRAMES - len(frame_indices)
                uniform_indices = [int(i * total_frames / needed) for i in range(needed)]
                frame_indices.extend(uniform_indices)
        else:
            frame_indices = [int(i * total_frames / NUM_FRAMES) for i in range(NUM_FRAMES)]
            
        frame_indices = sorted(list(set(frame_indices)))[:NUM_FRAMES]
        
    except ImportError:
        print("Warning: scenedetect not installed. Falling back to uniform frame extraction.")
        frame_indices = [int(i * total_frames / NUM_FRAMES) for i in range(NUM_FRAMES)]
        
    extracted_count = 0
    
    # Fast extraction using ffmpeg with select filter
    if frame_indices:
        try:
            # Create a complex filter string to select specific frames, escaping the comma for ffmpeg
            select_expr = '+'.join([rf"eq(n\,{idx})" for idx in frame_indices])
            output_pattern = os.path.join(frames_dir, "frame_%04d.jpg")
            
            subprocess.run(
                [ffmpeg_exe, '-y', '-i', video_path, '-vf', f"select={select_expr}", '-vsync', '0', '-q:v', '2', output_pattern],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True
            )
        except Exception as e:
            print(f"Error extracting frames with ffmpeg: {e}")
            # Fallback to OpenCV if ffmpeg fails
            cap = cv2.VideoCapture(video_path)
            for idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                if ret:
                    frame_path = os.path.join(frames_dir, f"frame_{extracted_count:04d}.jpg")
                    cv2.imwrite(frame_path, frame)
                    extracted_count += 1
            cap.release()
    
    return frames_dir, audio_path
