FROM python:3.10-slim

# Install system dependencies needed for OpenCV, Librosa (audio), and PyTorch
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    libgles2 \
    libegl1 \
    && rm -rf /var/lib/apt/lists/*

# Set up a new user named "user" with user ID 1000 (Required by Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user

# Set home and path for the user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set the working directory directly to backend
WORKDIR $HOME/app/backend

# Copy the requirements file and install dependencies
COPY --chown=user:user backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend files directly into the current directory
COPY --chown=user:user backend/ .

# Ensure the upload and report directories exist and are writable
RUN mkdir -p uploads reports weights

# Hugging Face Spaces exposes port 7860 by default
EXPOSE 7860

# Start the FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
