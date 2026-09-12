import React from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { TEST_DEFINITIONS } from '../../constants/testDefinitions';

const TestDefinition = ({ testId }) => {
  if (!testId || !TEST_DEFINITIONS[testId]) return null;
  const def = TEST_DEFINITIONS[testId];

  return (
    <details 
      style={{ 
        background: 'var(--panel-subtle)', 
        border: '1px solid var(--glass-border)', 
        borderLeft: '3px solid var(--primary)', 
        borderRadius: 'var(--radius-sm)', 
        overflow: 'hidden', 
        marginBottom: '0.75rem' 
      }}
    >
      <summary 
        style={{ 
          padding: '0.65rem 0.85rem', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          fontWeight: 600, 
          fontSize: '0.8rem',
          color: 'var(--text-main)', 
          listStyle: 'none', 
          userSelect: 'none' 
        }}
      >
        <BookOpen size={15} color="var(--primary)" />
        <span>Forensic Protocol &amp; Physical Theory: <strong style={{ color: 'var(--primary)' }}>{def.title}</strong></span>
      </summary>
      <div style={{ padding: '0 0.85rem 0.85rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--glass-border)', paddingTop: '0.65rem' }}>
        <div><strong style={{ color: 'var(--text-main)' }}>Physical Phenomenon:</strong> {def.what_is_it}</div>
        <div><strong style={{ color: 'var(--text-main)' }}>Detection Mechanism:</strong> {def.what_it_does}</div>
        <div><strong style={{ color: 'var(--text-main)' }}>Daubert Reliability:</strong> {def.how_good_is_it}</div>
        <div><strong style={{ color: 'var(--text-main)' }}>Adversarial Countermeasures:</strong> {def.how_to_bypass}</div>
      </div>
    </details>
  );
};

export default React.memo(TestDefinition);
