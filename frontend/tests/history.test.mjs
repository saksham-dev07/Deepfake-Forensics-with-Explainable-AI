import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/hooks/useHistory.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('export const', 'const');

function mount(storage) {
  let history;
  const hook = new Function('useState', 'useCallback', 'useEffect', 'localStorage', `${source}; return useHistory();`)(
    initial => { history = initial(); return [history, update => { history = typeof update === 'function' ? update(history) : update; }]; },
    callback => callback, effect => effect(), storage,
  );
  return { hook, getHistory: () => history };
}

test('malformed history cannot crash the application', () => {
  for (const saved of ['invalid json', '{}', '[null,3,{"jobId":"incomplete"}]']) {
    const host = mount({ getItem: () => saved, removeItem() {} });
    assert.deepEqual(host.getHistory(), []);
  }
});

test('blocked browser storage still permits session history and clearing', () => {
  const host = mount({ getItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } });
  host.hook.saveToHistory('job', { overall_score: 0.2, verdict: 'Likely Authentic' }, 'image.png');
  assert.equal(host.getHistory().length, 1);
  host.hook.clearHistory();
  assert.deepEqual(host.getHistory(), []);
});

test('history caps entries, deduplicates jobs and records demo provenance', () => {
  const host = mount({ getItem: () => '[]', removeItem() {} });
  for (let i = 0; i < 25; i++) host.hook.saveToHistory(`job-${i}`, { overall_score: 0.3, verdict: 'Likely Authentic' }, 'image.png');
  assert.equal(host.getHistory().length, 20);
  host.hook.saveToHistory('job-24', { overall_score: 0.3, verdict: 'Likely Authentic', is_demo: true }, 'image.png');
  assert.equal(host.getHistory().length, 20);
  assert.equal(host.getHistory()[0].isDemo, true);
});
