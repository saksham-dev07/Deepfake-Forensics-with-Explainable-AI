import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('section links support back/forward and ignore the skip-link fragment', () => {
  const source = readFileSync(new URL('../src/hooks/useHashNavigation.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export function', 'function');
  const listeners = new Map();
  const window = { location: { hash: '#models' }, addEventListener: (name, handler) => listeners.set(name, handler), removeEventListener: name => listeners.delete(name) };
  let route;
  let cleanup;
  const navigation = new Function('useState', 'useEffect', 'useCallback', 'window', `${source}; return useHashNavigation();`)(
    initial => { route = initial(); return [route, value => { route = value; }]; },
    effect => { cleanup = effect(); }, callback => callback, window,
  );
  assert.equal(navigation.activeNav, 'models');
  navigation.navigate('about');
  assert.equal(window.location.hash, 'methodology');
  assert.equal(route, 'about');
  for (const [hash, expected] of [['#history', 'history'], ['#analyze', 'analyze'], ['#models', 'models'], ['#main-content', 'models']]) {
    window.location.hash = hash;
    listeners.get('hashchange')();
    assert.equal(route, expected);
  }
  navigation.navigate('unknown');
  assert.equal(route, 'models');
  cleanup();
  assert.equal(listeners.size, 0);
});
