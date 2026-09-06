---
name: Bug Report
about: Create a report to help us improve the forensics platform or fix a bug
title: "[BUG] "
labels: ["bug", "triage"]
assignees: ''
---

### Describe the Bug
A clear and concise description of what the bug is.

### To Reproduce
Steps to reproduce the behavior:
1. Start the FastAPI backend with `uvicorn main:app --reload`
2. Upload media file via POST `/api/analyze` or Web Console
3. Observe terminal / console error output

### Expected Behavior
A clear and concise description of what you expected to happen.

### Error Logs & Traceback
```text
Paste any server or client error traces here
```

### Environment Specifications
- **OS**: [e.g. Windows 11, Ubuntu 22.04, macOS Sonoma]
- **Python Version**: [e.g. 3.10.12]
- **PyTorch Version**: [e.g. 2.1.0+cu118]
- **Device**: [e.g. NVIDIA RTX 3080, CPU]
- **Browser** (if web console issue): [e.g. Chrome 122, Firefox 123]
