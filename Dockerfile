# ========================================================
# Stage 1: Build Interactive Web Console (React 18 + Vite)
# ========================================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
# Empty VITE_API_URL ensures requests are relative to current origin on Hugging Face
ENV VITE_API_URL=""
RUN npm run build

# ========================================================
# Stage 2: Deep Learning Inference Runtime (Python 3.10)
# ========================================================
FROM python:3.10-slim

# Install system libraries for OpenCV, Librosa audio processing, and container forensics
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    libgles2 \
    libegl1 \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces requires a non-root user with UID 1000
RUN useradd -m -u 1000 user
USER user

# Configure environment variables for optimal container performance
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/tmp/.cache/huggingface \
    OMP_NUM_THREADS=4 \
    MKL_NUM_THREADS=4

WORKDIR $HOME/app/backend

# Pre-install CPU-optimized PyTorch wheels to maximize container speed and save disk space
RUN pip install --no-cache-dir \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining dependencies
COPY --chown=user:user backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y opencv-python opencv-python-headless opencv-contrib-python 2>/dev/null || true; \
    pip install --no-cache-dir opencv-contrib-python-headless

# Copy backend application source code
COPY --chown=user:user backend/ .

# Copy compiled frontend distribution from Stage 1 into backend static directory
COPY --chown=user:user --from=frontend-builder /app/frontend/dist ./static

# Create required mutable directories
RUN mkdir -p uploads reports weights temp

# Expose standard Hugging Face Spaces port
EXPOSE 7860

# Launch Uvicorn ASGI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
