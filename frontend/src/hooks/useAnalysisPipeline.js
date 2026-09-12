import { useState, useRef } from 'react';
import { API_BASE, API_KEY } from '../constants/api';

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
    // Watchdog Timer to detect silent backend drops
    let watchdogTimeout;
    const controller = new AbortController();
    
    const resetWatchdog = () => {
      clearTimeout(watchdogTimeout);
      watchdogTimeout = setTimeout(() => {
        controller.abort('Backend connection timed out (no data received for 45 seconds).');
      }, 45000);
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
      console.warn('SSE stream interrupted, transitioning to polling fallback...', err);
      fallbackPoll(currentJobId);
    }
  };

  const fallbackPoll = async (currentJobId) => {
    const pollInterval = 1200;
    let attempts = 0;
    const maxAttempts = 180; // ~3.5 minutes maximum wait

    const check = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        setStatus('idle');
        setError('Analysis timed out. The backend server took too long to complete.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/status/${currentJobId}`, {
          headers: { 'x-api-key': API_KEY }
        });

        if (!res.ok) {
          if (res.status === 404) {
            setStatus('idle');
            setError('Analysis job not found on server.');
            return;
          }
          setTimeout(check, pollInterval);
          return;
        }

        const data = await res.json();
        if (data.status === 'processing') {
          setProgress(data.progress || 0);
          if (data.telemetry) setTelemetry(data.telemetry);
          if (data.logs) setLogs(data.logs);
          setTimeout(check, pollInterval);
        } else if (data.status === 'completed') {
          setProgress(100);
          setStatus('complete');
          setResult(data.result);
        } else if (data.status === 'failed') {
          setStatus('idle');
          setError('Analysis failed: ' + (data.error || data.message || 'Unknown error'));
        } else {
          setTimeout(check, pollInterval);
        }
      } catch (e) {
        console.warn('Polling retry attempt...', e);
        setTimeout(check, pollInterval);
      }
    };

    check();
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
