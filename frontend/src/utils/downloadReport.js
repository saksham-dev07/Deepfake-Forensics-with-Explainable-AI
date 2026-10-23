import { API_KEY } from '../constants/api';
import { resolveMediaUrl } from './mediaUrl';

export async function requestReportPdf({ jobId, result, fileName, signal }) {
  if (!jobId || result?.is_demo) throw new Error('PDF export requires a completed analysis.');
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000);
  const options = { headers: { 'x-api-key': API_KEY }, signal: requestSignal };
  let response = await fetch(resolveMediaUrl(`/api/reports/${encodeURIComponent(jobId)}/pdf`), options);
  if (response.status === 202) throw new Error('The report is still being prepared. Try again shortly.');
  if (response.status === 401 || response.status === 403) throw new Error('Report access was denied. Check the configured API key.');
  if ([404, 410].includes(response.status) && result) {
    response = await fetch(resolveMediaUrl('/api/reports/generate'), { ...options, method: 'POST',
      headers: { ...options.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, filename: fileName || 'Media analysis', result }),
    });
  }
  if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : data.message || `PDF unavailable (${response.status}).`);
  }
  const blob = await response.blob();
  requestSignal.throwIfAborted();
  return blob;
}

export async function downloadReport(options) {
  const blob = await requestReportPdf(options);
  options.signal?.throwIfAborted();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Forensic_Report_${options.jobId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
