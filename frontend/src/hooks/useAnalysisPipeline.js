import { useState, useRef } from 'react';

export const useAnalysisPipeline = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [telemetry, setTelemetry] = useState(null);
  const [logs, setLogs] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('File too large. Maximum size is 100 MB.');
        } else if (response.status === 400) {
          throw new Error('Invalid file type or bad request.');
        } else {
          throw new Error('Backend processing failed or server is unreachable.');
        }
      }

      const data = await response.json();
      setJobId(data.job_id);
      setStatus('processing');
      setError(null);
      pollStatus(data.job_id);
    } catch (err) {
      console.error(err);
      setStatus('idle');
      setError(err.message || 'Error uploading file. Please ensure the backend server is running.');
    }
  };

  const pollStatus = async (currentJobId) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    const API_KEY = import.meta.env.VITE_API_KEY || 'deepforensics-dev-key';
    
    // Watchdog Timer to detect silent backend drops
    let watchdogTimeout;
    const controller = new AbortController();
    
    const resetWatchdog = () => {
      clearTimeout(watchdogTimeout);
      watchdogTimeout = setTimeout(() => {
        controller.abort('Backend connection timed out (no data received for 15 seconds).');
      }, 15000);
    };

    try {
      const response = await fetch(`${API_BASE}/api/status/${currentJobId}/stream`, {
        headers: {
          'x-api-key': API_KEY,
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Stream connection failed: ${response.status}`);
      }

      resetWatchdog();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        resetWatchdog();
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages separated by double newlines
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // Keep incomplete chunk in buffer
        
        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.substring(6);
            try {
              const data = JSON.parse(dataStr);
              
              if (data.status === 'processing') {
                setProgress(data.progress || 0);
                if (data.telemetry) setTelemetry(data.telemetry);
                if (data.logs) setLogs(data.logs);
              } else if (data.status === 'completed') {
                setProgress(100);
                setStatus('complete');
                setResult(data.result);
                clearTimeout(watchdogTimeout);
                return;
              } else if (data.status === 'failed' || !data.status) {
                setStatus('idle');
                setError('Analysis failed: ' + (data.error || data.message || 'Job not found or unknown error'));
                clearTimeout(watchdogTimeout);
                return;
              }
            } catch (err) {
              console.error('Error parsing stream JSON', err);
            }
          }
        }
      }
      clearTimeout(watchdogTimeout);
    } catch (err) {
      clearTimeout(watchdogTimeout);
      console.error('Stream error', err);
      setStatus('idle');
      setError(err.message || 'Lost connection to the backend server while streaming status.');
    }
  };

  const resetApp = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setTelemetry(null);
    setLogs([]);
    setJobId(null);
    setResult(null);
    setError(null);
  };

  return {
    file,
    status,
    progress,
    telemetry,
    logs,
    jobId,
    result,
    error,
    setError,
    handleFileUpload,
    resetApp
  };
};
