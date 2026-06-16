import cv2
import os
import subprocess

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

    # 1. Extract Audio using moviepy (which bundles a working ffmpeg binary)
    try:
        from moviepy import VideoFileClip
        clip = VideoFileClip(video_path)
        
        # Check if it has an audio track
        if clip.audio is not None:
            # Write it out silently
            clip.audio.write_audiofile(audio_path, logger=None)
        else:
            audio_path = None
            
        clip.close()
        
        if audio_path and (not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0):
            audio_path = None
    except Exception as e:
        print(f"Error extracting audio with moviepy: {e}")
        audio_path = None # Audio extraction failed

    # 2. Extract 16 Frames using OpenCV
    frame_interval = max(1, total_frames // NUM_FRAMES)
    
    extracted_count = 0
    for i in range(total_frames):
        ret, frame = cap.read()
        if not ret:
            break
            
        if i % frame_interval == 0 and extracted_count < NUM_FRAMES:
            frame_path = os.path.join(frames_dir, f"frame_{extracted_count:04d}.jpg")
            cv2.imwrite(frame_path, frame)
            extracted_count += 1
            
    cap.release()
    
    return frames_dir, audio_path
