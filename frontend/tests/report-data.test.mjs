import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { readFileSync, statSync } from 'node:fs';

test('every registered benchmark ships valid metrics and a diagnostic image', () => {
  const source = readFileSync(new URL('../src/components/ModelsOverview.jsx', import.meta.url), 'utf8');
  const records = [...source.matchAll(/folder: '([^']+)', file: '([^']+)', image: '([^']+)'/g)];
  assert.equal(records.length, 3);
  for (const [, folder, file, image] of records) {
    const base = new URL(`../public/benchmark_artifacts/${folder}/`, import.meta.url);
    const data = JSON.parse(readFileSync(new URL(file, base), 'utf8'));
    const count = data.Total_Videos ?? data.Total_Images;
    assert.ok(count > 0);
    assert.equal(Object.values(data.Confusion_Matrix).reduce((sum, value) => sum + value, 0), count);
    assert.ok(statSync(new URL(image, base)).size > 0);
  }
});

test('missing measurements stay unavailable and real zero values remain visible', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    const { diagnosticData, formatPercent, formatValue, availableTests } = await server.ssrLoadModule('/src/utils/reportData.js');
    assert.equal(diagnosticData({}, 'eye').score, null);
    assert.equal(diagnosticData({ eye_score: 0 }, 'eye').score, 0);
    assert.equal(diagnosticData({ eye_score: 0.5, eye_analysis: { warnings: ['No face'] } }, 'eye').score, null);
    assert.equal(diagnosticData({ voice_score: 0.2, voice_analysis: { available: false } }, 'voice').score, null);
    for (const value of [undefined, null, NaN, Infinity, -1, 2]) assert.equal(formatPercent(value), 'N/A');
    assert.equal(formatPercent(0), '0.0%');
    assert.equal(formatPercent(0.99955), '>99.9%');
    assert.equal(formatPercent(0.99955, 2), '99.95%');
    assert.equal(formatPercent(0.0001), '<0.1%');
    assert.equal(formatPercent(1), '100.0%');
    assert.equal(formatValue(0), '0');
    assert.equal(formatValue(false, 'boolean'), 'No');
    assert.ok(!availableTests({}, 'image.webp').includes('audio'));
    assert.ok(!availableTests({ file_metadata: { has_audio: false } }, 'movie.webm').includes('voice'));
    assert.ok(availableTests({ file_metadata: { has_audio: true } }, 'movie.webm').includes('voice'));
    const { default: Ring } = await server.ssrLoadModule('/src/components/ui/ScoreRing.jsx');
    const missing = renderToString(React.createElement(Ring, { score: Infinity }));
    assert.match(missing, /unavailable/);
    assert.match(missing, />N\/A</);
    const { default: Report } = await server.ssrLoadModule('/src/components/ReportDashboard.jsx');
    const report = renderToString(React.createElement(Report, { result: {} }));
    assert.match(report, /Evaluation unavailable/);
    assert.doesNotMatch(report, /Likely Authentic|NaN|Infinity/);
  } finally { await server.close(); }
});

test('PDF downloads distinguish pending, unauthorized, missing, and valid responses', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  const originalFetch = globalThis.fetch;
  try {
    const { requestReportPdf } = await server.ssrLoadModule('/src/utils/downloadReport.js');
    for (const status of [202, 401, 403]) {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return new Response('{}', { status, headers: { 'content-type': 'application/json' } }); };
      await assert.rejects(requestReportPdf({ jobId: 'test', result: {} }));
      assert.equal(calls, 1, 'pending or denied requests must not trigger regeneration');
    }
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1 ? new Response('{}', { status: 404 }) : new Response('%PDF-test', { headers: { 'content-type': 'application/pdf' } });
    };
    const blob = await requestReportPdf({ jobId: 'case-123', result: { overall_score: 0.2 } });
    assert.equal(await blob.text(), '%PDF-test');
    assert.equal(calls.length, 2);
    assert.equal(calls[1].options.method, 'POST');
    assert.ok(calls.every(call => call.options.headers['x-api-key']));
    globalThis.fetch = async () => new Response('<html>error</html>', { headers: { 'content-type': 'text/html' } });
    await assert.rejects(requestReportPdf({ jobId: 'test' }));
  } finally { globalThis.fetch = originalFetch; await server.close(); }
});
