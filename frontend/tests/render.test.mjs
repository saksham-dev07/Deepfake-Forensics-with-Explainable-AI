import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

test('analytical tabs render with sample reports and unavailable detector data', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    const { SAMPLE_REPORTS } = await server.ssrLoadModule('/src/constants/sampleReports.js');
    const { default: ModelsOverview } = await server.ssrLoadModule('/src/components/ModelsOverview.jsx');
    assert.ok(renderToString(React.createElement(ModelsOverview)).length > 0);
    const { default: App } = await server.ssrLoadModule('/src/App.jsx');
    const app = renderToString(React.createElement(App));
    assert.match(app, /Main navigation/);
    assert.match(app, /Choose an image or video/);
    const { default: Report } = await server.ssrLoadModule('/src/components/ReportDashboard.jsx');
    const demo = renderToString(React.createElement(Report, { result: { ...SAMPLE_REPORTS.deepfake_face.result, is_demo: true }, fileName: 'demo.mp4', jobId: 'demo' }));
    assert.match(demo, /Demo report/);
    assert.match(demo, /No uploaded media was analyzed/);
    assert.match(demo, /<button[^>]*disabled=""[^>]*>/);
    for (const name of ['Audio', 'Cfa', 'Color', 'Corneal', 'Ela', 'Eye', 'Features', 'Flow', 'Frequency', 'Geometry', 'Lighting', 'Meta', 'Noise', 'Rppg', 'Visual', 'Voice']) {
      const { default: Tab } = await server.ssrLoadModule(`/src/components/tabs/${name}Tab.jsx`);
      for (const result of [SAMPLE_REPORTS.deepfake_face.result, {}]) {
        const html = renderToString(React.createElement(Tab, {
          result, getScoreColor: () => 'var(--primary)', getSyncColor: () => 'success',
          setZoomedImage: () => {}, hiddenCards: {}, expandedCards: {},
          toggleExpand: () => {}, hideCard: () => {},
        }));
        assert.ok(html.length > 0, `${name} tab should render`);
        if (name !== 'Features' && Object.keys(result).length === 0) {
          assert.match(html, /Measurement unavailable/);
          assert.doesNotMatch(html, /Certified authentic|Verified Authentic|NaN|Infinity/);
        }
      }
    }
  } finally {
    await server.close();
  }
});
