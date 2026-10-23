import { useState, useRef, useEffect, useCallback } from 'react';
import { API_KEY } from '../constants/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

export const useAnalysisPipeline = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [telemetry, setTelemetry] = useState(null);
  const [logs, setLogs] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const activeRun = useRef(null);

  const stopWatching = useCallback(() => {
    const run = activeRun.current;
    activeRun.current = null;
    if (!run) return;
    run.controller.abort();
    run.streamController?.abort();
    run.pollController?.abort();
    clearTimeout(run.pollTimer);
    clearTimeout(run.watchdog);
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return;
    stopWatching();
    setProgress(0);
    setTelemetry(null);
    setLogs([]);
    setResult(null);
    setJobId(null);
    setError(null);
    const extension = selectedFile.name?.split('.').pop().toLowerCase();
    if (!['mp4', 'avi', 'mov', 'mkv', 'webm', 'png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
      setStatus('idle');
      setError('Unsupported format. Use MP4, AVI, MOV, MKV, WEBM, JPG, PNG, or WEBP.');
      return;
    }
    if (selectedFile.size > 100 * 1024 * 1024) {
      setStatus('idle');
      setError('File too large. Maximum size is 100 MB.');
      return;
    }
    if (!selectedFile.size) {
      setStatus('idle');
      setError('This file is empty. Choose a nonempty image or video.');
      return;
    }
    const run = { controller: new AbortController() };
    activeRun.current = run;
    const isCurrent = () => activeRun.current === run;
    setFile(selectedFile);
    setStatus('uploading');

    const acceptStatus = (data) => {
      if (!isCurrent()) return true;
      if (data.status === 'processing') {
        setProgress(typeof data.progress === 'number' && Number.isFinite(data.progress) ? Math.max(0, Math.min(100, data.progress)) : 0);
        if (data.telemetry) setTelemetry(data.telemetry);
        if (Array.isArray(data.logs)) setLogs(data.logs.flatMap(line => typeof line === 'string' ? [{ type: 'INFO', msg: line }]
          : typeof line?.msg === 'string' ? [{ type: typeof line.type === 'string' ? line.type : 'INFO', msg: line.msg }] : []));
        return false;
      }
      if (data.status === 'completed' && data.result) {
        setProgress(100);
        setStatus('complete');
        setResult(data.result);
      } else {
        setStatus('idle');
        setError('Analysis failed: ' + (data.error || data.message || 'Unknown job state'));
      }
      stopWatching();
      return true;
    };

    const fallbackPoll = async (currentJobId, attempts = 0) => {
      if (!isCurrent()) return;
      if (attempts >= 180) {
        acceptStatus({ status: 'failed', error: 'Analysis timed out.' });
        return;
      }
      run.pollController = new AbortController();
      run.watchdog = setTimeout(() => run.pollController.abort(), 15000);
      try {
        const response = await fetch(resolveMediaUrl(`/api/status/${currentJobId}`), {
          headers: { 'x-api-key': API_KEY }, signal: run.pollController.signal,
        });
        if (!isCurrent()) return;
        if ([401, 403, 404].includes(response.status)) {
          acceptStatus({ status: 'failed', error: response.status === 404 ? 'Job not found on server.' : 'API authorization failed.' });
          return;
        }
        if (response.ok && acceptStatus(await response.json())) return;
      } catch {
        // Transient network failures retry while this run is still active.
      } finally {
        clearTimeout(run.watchdog);
      }
      if (isCurrent()) run.pollTimer = setTimeout(() => fallbackPoll(currentJobId, attempts + 1), 1200);
    };

    const watchStatus = async (currentJobId) => {
      run.streamController = new AbortController();
      const resetWatchdog = () => {
        clearTimeout(run.watchdog);
        run.watchdog = setTimeout(() => run.streamController.abort(), 45000);
      };
      let reader;
      try {
        resetWatchdog(); // Includes time spent waiting for response headers.
        const response = await fetch(resolveMediaUrl(`/api/status/${currentJobId}/stream`), {
          headers: { 'x-api-key': API_KEY }, signal: run.streamController.signal,
        });
        if (!isCurrent()) return;
        if (!response.ok) throw new Error(`Stream connection failed: ${response.status}`);
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (isCurrent()) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!isCurrent()) return;
          resetWatchdog();
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split(/\r?\n\r?\n/);
          buffer = parts.pop();
          for (const part of parts) {
            const payload = part.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
            if (!payload) continue;
            let data;
            try { data = JSON.parse(payload); } catch { continue; }
            if (acceptStatus(data)) return;
          }
        }
      } catch {
        // An interrupted stream and an early clean EOF both fall back to polling.
      } finally {
        clearTimeout(run.watchdog);
        run.streamController.abort();
        if (reader) await reader.cancel().catch(() => {});
      }
      if (isCurrent()) await fallbackPoll(currentJobId);
    };

    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const response = await fetch(resolveMediaUrl('/api/analyze'), {
        method: 'POST', headers: { 'x-api-key': API_KEY }, body: formData, signal: run.controller.signal,
      });
      if (!isCurrent()) return;
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Upload failed (${response.status}).`);
      }
      const data = await response.json();
      if (!isCurrent()) return;
      if (typeof data.job_id !== 'string' || !data.job_id) throw new Error('The backend did not return an analysis ID. Try again.');
      setJobId(data.job_id);
      setStatus('processing');
      await watchStatus(data.job_id);
    } catch (err) {
      if (!isCurrent()) return;
      setStatus('idle');
      setError(err.name === 'TypeError' ? 'Forensic backend is unreachable. Check the backend service or try an instant demo.' : err.message);
      stopWatching();
    }
  };

  const resetApp = () => {
    stopWatching();
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setTelemetry(null);
    setLogs([]);
    setJobId(null);
    setResult(null);
    setError(null);
  };

  const loadSampleResult = (sample) => {
    if (!sample) return;
    resetApp();
    setFile({ name: sample.meta.fileName, size: sample.result.file_metadata.file_size_bytes });
    setJobId(sample.meta.id);
    setResult({ ...sample.result, is_demo: true });
    setProgress(100);
    setStatus('complete');
  };

  return { file, status, progress, telemetry, logs, jobId, result, error, setError, handleFileUpload, loadSampleResult, resetApp };
};
