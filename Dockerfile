FROM python:3.10-slim

# Install system dependencies needed for OpenCV, Librosa, and PyTorch
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    libgles2 \
    libegl1 \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Set up Hugging Face required non-root user
RUN useradd -m -u 1000 user
USER user

# Set environment variables
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/tmp/.cache/huggingface

WORKDIR $HOME/app/backend

# Install CPU-only PyTorch FIRST to save space
RUN pip install --no-cache-dir \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining dependencies
COPY --chown=user:user backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y opencv-python opencv-python-headless opencv-contrib-python 2>/dev/null || true; \
    pip install --no-cache-dir opencv-contrib-python-headless

# Copy the backend source code
COPY --chown=user:user backend/ .

# Create dynamic directories
RUN mkdir -p uploads reports weights

# Expose port 7860 for Hugging Face
EXPOSE 7860

# Start FastAPI via Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
