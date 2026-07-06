import { useState, useRef } from 'react';

export const useAnalysisPipeline = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [telemetry, setTelemetry] = useState(null);
  const [logs, setLogs] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setStatus('uploading');

    const formData = new FormData();
    formData.append('file', selectedFile);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    const API_KEY = import.meta.env.VITE_API_KEY || 'deepforensics-dev-key';
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setJobId(data.job_id);
      setStatus('processing');
      pollStatus(data.job_id);
    } catch (error) {
      console.error(error);
      setStatus('idle');
      alert('Error uploading file. Please ensure the backend server is running.');
    }
  };

  const pollStatus = (currentJobId) => {
    const interval = setInterval(async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const API_KEY = import.meta.env.VITE_API_KEY || 'deepforensics-dev-key';
        const response = await fetch(`${API_BASE}/api/status/${currentJobId}`, {
          headers: {
            'x-api-key': API_KEY,
          }
        });
        const data = await response.json();

        if (data.status === 'processing') {
          setProgress(data.progress || 0);
          if (data.telemetry) setTelemetry(data.telemetry);
          if (data.logs) setLogs(data.logs);
        } else if (data.status === 'completed') {
          clearInterval(interval);
          setProgress(100);
          setStatus('complete');
          setResult(data.result);
        } else if (data.status === 'failed' || !data.status) {
          clearInterval(interval);
          setStatus('idle');
          alert('Analysis failed: ' + (data.error || data.message || 'Job not found or unknown error'));
        }
      } catch (error) {
        console.error('Status poll error', error);
      }
    }, 1500);
  };

  const resetApp = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setTelemetry(null);
    setLogs([]);
    setJobId(null);
    setResult(null);
  };

  return {
    file,
    status,
    progress,
    telemetry,
    logs,
    jobId,
    result,
    handleFileUpload,
    resetApp
  };
};
