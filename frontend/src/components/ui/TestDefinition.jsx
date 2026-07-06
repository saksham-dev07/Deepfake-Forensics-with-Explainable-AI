import React from 'react';
import { BookOpen } from 'lucide-react';
import { TEST_DEFINITIONS } from '../../constants/testDefinitions';

const TestDefinition = ({ testId }) => {
  if (!testId || !TEST_DEFINITIONS[testId]) return null;
  const def = TEST_DEFINITIONS[testId];
  return (
    <details className="glass-panel" style={{ borderLeft: '4px solid var(--primary)', padding: '0', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.5rem' }}>
      <summary style={{ padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)', listStyle: 'none', userSelect: 'none' }}>
        <BookOpen size={18} color="var(--primary)" />
        Theory & Definition: {def.title}
      </summary>
      <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <div><strong style={{ color: 'var(--text-primary)' }}>What is it:</strong> {def.what_is_it}</div>
        <div><strong style={{ color: 'var(--text-primary)' }}>What it does:</strong> {def.what_it_does}</div>
        <div><strong style={{ color: 'var(--text-primary)' }}>How good is it:</strong> {def.how_good_is_it}</div>
        <div><strong style={{ color: 'var(--text-primary)' }}>How to bypass it:</strong> {def.how_to_bypass}</div>
      </div>
    </details>
  );
};

export default TestDefinition;
