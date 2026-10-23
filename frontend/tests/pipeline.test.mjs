import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Execute the actual hook with a small hook host so network races are deterministic.
const source = readFileSync(new URL('../src/hooks/useAnalysisPipeline.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('export const', 'const');

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

function mount(fetch) {
  const state = [];
  const effects = [];
  const timers = new Map();
  let id = 0;
  const hook = new Function('useState', 'useRef', 'useEffect', 'useCallback', 'fetch', 'API_KEY', 'resolveMediaUrl', 'setTimeout', 'clearTimeout', `${source}; return useAnalysisPipeline();`)(
    initial => {
      const index = state.push(initial) - 1;
      return [initial, value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    value => ({ current: value }),
    effect => { effects.push(effect()); },
    callback => callback,
    fetch, 'test-key', path => path,
    callback => { timers.set(++id, callback); return id; },
    timer => timers.delete(timer),
  );
  return { hook, state, timers, unmount: () => effects.forEach(cleanup => cleanup?.()) };
}

const file = () => new File(['test'], 'sample.png', { type: 'image/png' });
const response = data => ({ ok: true, status: 200, json: async () => data });
const tick = () => new Promise(resolve => setImmediate(resolve));

test('empty media is rejected before a request and missing backend IDs fail clearly', async () => {
  let calls = 0;
  const host = mount(async () => { calls++; return response({}); });
  await host.hook.handleFileUpload(new File([], 'empty.png'));
  assert.equal(calls, 0);
  assert.match(host.state[7], /empty/i);
  await host.hook.handleFileUpload(file());
  assert.equal(calls, 1);
  assert.equal(host.state[1], 'idle');
  assert.match(host.state[7], /analysis ID/i);
});

test('reset aborts upload and ignores a late job response', async () => {
  const pending = deferred();
  let signal;
  const host = mount((url, options) => { signal = options.signal; return pending.promise; });
  const upload = host.hook.handleFileUpload(file());
  host.hook.resetApp();
  assert.equal(signal.aborted, true);
  pending.resolve(response({ job_id: 'old' }));
  await upload;
  assert.equal(host.state[1], 'idle');
  assert.equal(host.state[5], null);
});

test('reset aborts an active stream and ignores its late completion', async () => {
  const pendingRead = deferred();
  let streamSignal;
  const host = mount(async (url, options) => {
    if (url === '/api/analyze') return response({ job_id: 'old' });
    streamSignal = options.signal;
    return { ok: true, body: { getReader: () => ({ read: () => pendingRead.promise, cancel: async () => {} }) } };
  });
  const upload = host.hook.handleFileUpload(file());
  await tick();
  host.hook.resetApp();
  assert.equal(streamSignal.aborted, true);
  pendingRead.resolve({ done: false, value: new TextEncoder().encode('data: {"status":"completed","result":{"old":true}}\n\n') });
  await upload;
  assert.equal(host.state[1], 'idle');
  assert.equal(host.state[6], null);
  assert.equal(host.timers.size, 0);
});

test('clean early SSE EOF falls back to polling', async () => {
  const calls = [];
  const host = mount(async url => {
    calls.push(url);
    if (url === '/api/analyze') return response({ job_id: 'job' });
    if (url.endsWith('/stream')) return { ok: true, body: { getReader: () => ({ read: async () => ({ done: true }), cancel: async () => {} }) } };
    return response({ status: 'completed', result: { overall_score: 0.2 } });
  });
  await host.hook.handleFileUpload(file());
  assert.deepEqual(calls, ['/api/analyze', '/api/status/job/stream', '/api/status/job']);
  assert.equal(host.state[1], 'complete');
  assert.equal(host.state[6].overall_score, 0.2);
  assert.equal(host.timers.size, 0);
});

test('SSE handles split CRLF messages and stops at completion', async () => {
  const messages = ['data: {"status":"process', 'ing","progress":50}\r\n\r\ndata: {"status":"completed","result":{"ok":true}}\r\n\r\n'];
  const host = mount(async url => url === '/api/analyze' ? response({ job_id: 'job' }) : {
    ok: true, body: { getReader: () => ({ read: async () => ({ done: false, value: new TextEncoder().encode(messages.shift()) }), cancel: async () => {} }) },
  });
  await host.hook.handleFileUpload(file());
  assert.equal(host.state[1], 'complete');
  assert.equal(host.state[2], 100);
  assert.equal(host.state[6].ok, true);
});

test('unmount clears polling timers and requests', async () => {
  const host = mount(async url => {
    if (url === '/api/analyze') return response({ job_id: 'job' });
    if (url.endsWith('/stream')) throw new Error('offline');
    return response({ status: 'processing', progress: 30 });
  });
  await host.hook.handleFileUpload(file());
  assert.equal(host.timers.size, 1);
  host.unmount();
  assert.equal(host.timers.size, 0);
});

test('malformed progress and log entries cannot break the processing screen', async () => {
  let payload;
  const host = mount(async url => {
    if (url === '/api/analyze') return response({ job_id: 'job' });
    if (url.endsWith('/stream')) throw new Error('offline');
    return response(payload);
  });
  for (const [progress, expected] of [[Infinity, 0], [-5, 0], [120, 100]]) {
    payload = { status: 'processing', progress, logs: ['Plain message', { type: 'OK', msg: 'Ready' }, null, {}, { msg: { invalid: true } }] };
    await host.hook.handleFileUpload(file());
    assert.equal(host.state[2], expected);
    assert.deepEqual(host.state[4], [{ type: 'INFO', msg: 'Plain message' }, { type: 'OK', msg: 'Ready' }]);
  }
  host.unmount();
});

test('unsupported formats and oversized files never reach the backend', async () => {
  const host = mount(() => { throw new Error('unexpected network request'); });
  await host.hook.handleFileUpload(new File(['test'], 'sample.gif'));
  assert.match(host.state[7], /Unsupported format/);
  await host.hook.handleFileUpload({ name: 'large.mp4', size: 101 * 1024 * 1024 });
  assert.match(host.state[7], /100 MB/);
});

test('a stalled stream header request times out and falls back to polling', async () => {
  let signal;
  const host = mount(async (url, options) => {
    if (url === '/api/analyze') return response({ job_id: 'job' });
    if (url.endsWith('/stream')) {
      signal = options.signal;
      return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout'))));
    }
    return response({ status: 'completed', result: { recovered: true } });
  });
  const upload = host.hook.handleFileUpload(file());
  await tick();
  assert.equal(host.timers.size, 1);
  [...host.timers.values()][0]();
  await upload;
  assert.equal(signal.aborted, true);
  assert.equal(host.state[6].recovered, true);
});

test('a replacement upload cannot be overwritten by the older upload', async () => {
  const old = deferred();
  let uploads = 0;
  const host = mount(async url => {
    if (url === '/api/analyze') return ++uploads === 1 ? old.promise : response({ job_id: 'new' });
    return { ok: true, body: { getReader: () => ({
      read: async () => ({ done: false, value: new TextEncoder().encode('data: {"status":"completed","result":{"current":true}}\n\n') }),
      cancel: async () => {},
    }) } };
  });
  const first = host.hook.handleFileUpload(file());
  await host.hook.handleFileUpload(file());
  old.resolve(response({ job_id: 'old' }));
  await first;
  assert.equal(host.state[5], 'new');
  assert.equal(host.state[6].current, true);
});

test('sample loading marks the report as illustrative without mutating the fixture', () => {
  const host = mount(() => { throw new Error('demos should not upload'); });
  const sample = { meta: { id: 'demo', fileName: 'demo.png' }, result: { overall_score: 0.2, file_metadata: { file_size_bytes: 42 } } };
  host.hook.loadSampleResult(sample);
  assert.equal(host.state[6].is_demo, true);
  assert.equal(sample.result.is_demo, undefined);
});
