# ==========================================
# STAGE 1: Build the React Frontend
# ==========================================
FROM node:18 AS frontend-builder
WORKDIR /app/frontend

# Copy frontend dependency files and install
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Copy frontend source and build
COPY frontend/ .
RUN npm run build

# ==========================================
# STAGE 2: Build the FastAPI Backend
# ==========================================
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

# Set environment variables (HF_HOME ensures weights don't crash with Permission Denied)
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/tmp/.cache/huggingface

WORKDIR $HOME/app/backend

# Install CPU-only PyTorch FIRST to save 2.5GB of useless CUDA libraries
RUN pip install --no-cache-dir \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining dependencies
COPY --chown=user:user backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y opencv-python opencv-python-headless opencv-contrib-python 2>/dev/null; \
    pip install --no-cache-dir opencv-contrib-python-headless

# Copy the backend source code
COPY --chown=user:user backend/ .

# Create dynamic directories
RUN mkdir -p uploads reports weights

# ==========================================
# STAGE 3: Merge Frontend into Backend
# ==========================================
# Copy the compiled React 'dist' directory from Stage 1 into the backend's 'static' folder
COPY --from=frontend-builder --chown=user:user /app/frontend/dist $HOME/app/backend/static

# Expose Hugging Face Space default port
EXPOSE 7860

# Start FastAPI via Gunicorn with Uvicorn workers
CMD ["gunicorn", "main:app", "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:7860", "--timeout", "300"]
