# ==============================================================================
# Deploy Backend API to Hugging Face Spaces
# Space: https://huggingface.co/spaces/SakshamDev07/deepfake-forensics-api
# ==============================================================================

param (
    [string]$CommitMessage = "Deploy updated deepfake forensics backend API",
    [string]$SpaceRemote = "https://huggingface.co/spaces/SakshamDev07/deepfake-forensics-api"
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$src = Join-Path $workspaceRoot "backend"
$deployDir = Join-Path $env:TEMP "hf-backend-deploy"

Write-Host "==> [1/4] Preparing temporary clean deployment bundle in $deployDir..." -ForegroundColor Cyan
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $deployDir
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

# Copy root deployment configuration & code
Copy-Item (Join-Path $src "Dockerfile") (Join-Path $deployDir "Dockerfile")
Copy-Item (Join-Path $src "README.md") (Join-Path $deployDir "README.md")
Copy-Item (Join-Path $src "requirements.txt") (Join-Path $deployDir "requirements.txt")
Copy-Item (Join-Path $src "main.py") (Join-Path $deployDir "main.py")
Copy-Item (Join-Path $src ".dockerignore") (Join-Path $deployDir ".dockerignore")
Copy-Item (Join-Path $src ".gitattributes") (Join-Path $deployDir ".gitattributes")

# Copy pipeline & weights
Copy-Item -Recurse (Join-Path $src "pipeline") (Join-Path $deployDir "pipeline")
Copy-Item -Recurse (Join-Path $src "weights") (Join-Path $deployDir "weights")

# Clean bytecode
Get-ChildItem -Path $deployDir -Include "__pycache__" -Recurse -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "==> [2/4] Initializing Git with LFS tracking..." -ForegroundColor Cyan
Push-Location $deployDir
try {
    git init -b main | Out-Null
    git config user.name "Saksham Agarwal"
    git config user.email "sakshamagarwal123@gmail.com"
    git lfs install | Out-Null

    git add .gitattributes
    git add .
    git commit -m $CommitMessage | Out-Null

    Write-Host "==> [3/4] Adding Hugging Face remote..." -ForegroundColor Cyan
    git remote add origin $SpaceRemote

    Write-Host "==> [4/4] Pushing to Hugging Face Spaces ($SpaceRemote)..." -ForegroundColor Cyan
    git push origin main --force

    Write-Host "`n[SUCCESS] Backend successfully deployed to Hugging Face Spaces!" -ForegroundColor Green
    Write-Host "Space URL:  https://huggingface.co/spaces/SakshamDev07/deepfake-forensics-api" -ForegroundColor Yellow
    Write-Host "Live API:   https://sakshamdev07-deepfake-forensics-api.hf.space`n" -ForegroundColor Yellow
} finally {
    Pop-Location
}
