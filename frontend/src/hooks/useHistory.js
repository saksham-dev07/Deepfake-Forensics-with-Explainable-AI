import { useState, useEffect } from 'react';

export const useHistory = () => {
  const [history, setHistory] = useState([]);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('df_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save a new job to history
  const saveToHistory = (jobId, result, fileName) => {
    setHistory(prev => {
      // Check if it already exists
      if (prev.some(item => item.jobId === jobId)) return prev;

      const newItem = {
        jobId,
        fileName: fileName || `Analysis_${jobId.substring(0, 6)}`,
        date: new Date().toISOString(),
        score: result.overall_score,
        verdict: result.verdict,
      };

      const newHistory = [newItem, ...prev].slice(0, 20); // Keep last 20
      localStorage.setItem('df_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // Clear history
  const clearHistory = () => {
    localStorage.removeItem('df_history');
    setHistory([]);
  };

  return { history, saveToHistory, clearHistory };
};
