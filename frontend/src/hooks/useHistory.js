import { useState, useCallback, useEffect } from 'react';

export const useHistory = () => {
  const [history, setHistory] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('df_history') || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && typeof item.jobId === 'string' &&
        typeof item.fileName === 'string' && typeof item.verdict === 'string' &&
        Number.isFinite(item.score) && item.score >= 0 && item.score <= 1 &&
        typeof item.date === 'string' && Number.isFinite(Date.parse(item.date))).slice(0, 20) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (history.length) localStorage.setItem('df_history', JSON.stringify(history));
      else localStorage.removeItem('df_history');
    } catch {
      // Private browsing or full storage must not prevent an analysis.
    }
  }, [history]);

  const saveToHistory = useCallback((jobId, result, fileName) => {
    if (!jobId || !Number.isFinite(result?.overall_score)) return;
    setHistory(previous => {
      const existing = previous.find(item => item.jobId === jobId);
      const isDemo = result.is_demo === true;
      if (existing) {
        return Boolean(existing.isDemo) === isDemo ? previous : previous.map(item => item.jobId === jobId ? { ...item, isDemo } : item);
      }
      return [{ jobId, fileName: fileName || `Analysis_${jobId.slice(0, 6)}`,
        date: new Date().toISOString(), score: result.overall_score,
        verdict: result.verdict || 'Inconclusive', isDemo }, ...previous].slice(0, 20);
    });
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);
  return { history, saveToHistory, clearHistory };
};
