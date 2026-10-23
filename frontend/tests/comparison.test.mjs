import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

test('all diagnostics use measured exhibits and only spatial images offer comparison', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    const { DIAGNOSTICS } = await server.ssrLoadModule('/src/constants/diagnostics.js');
    for (const [id, config] of Object.entries(DIAGNOSTICS).filter(([id]) => id !== 'meta')) {
      const name = { cfa: 'Cfa', rppg: 'Rppg' }[id] || id[0].toUpperCase() + id.slice(1);
      const { default: Tab } = await server.ssrLoadModule(`/src/components/tabs/${name}Tab.jsx`);
      const result = { face_crop_path: 'uploads/face.jpg', first_frame_path: 'uploads/frame.jpg', [config.topScore]: 0.2 };
      const first = config.exhibits[0];
      if (id === 'visual') result.heatmaps = ['uploads/attention.jpg'];
      else result[config.module] = { [config.score]: 0.2, [first.path]: `uploads/${id}.jpg` };
      const html = renderToString(React.createElement(Tab, { result }));
      assert.match(html, /class="comparison-layer evidence-image-layer"/);
      if (first.spatial) {
        assert.ok(html.includes(id === 'visual' ? result.face_crop_path : result.first_frame_path), `${id}: coordinate systems must match`);
        assert.match(html, /aria-label="Comparison position"/);
        assert.match(html, /aria-label="Comparison position control"/);
      } else {
        assert.doesNotMatch(html, /aria-label="Comparison position"/, `${id}: charts must not be wiped against a photo`);
      }
      const empty = renderToString(React.createElement(Tab, { result: {} }));
      assert.match(empty, /No image was returned/);
      assert.doesNotMatch(empty, /<img|data:image|NaN|Infinity|Procrustes:|Certified authentic/);
    }
    const { default: Divider } = await server.ssrLoadModule('/src/components/ui/WipeDivider.jsx');
    for (const [input, expected] of [[-10,0],[0,0],[50,50],[100,100],[120,100],[NaN,50]]) {
      const html = renderToString(React.createElement(Divider, { wipePercent: input, setWipePercent: () => {} }));
      assert.ok(html.includes(`aria-valuenow="${expected}"`));
      assert.match(html, /clamp\(22px/);
    }
    const media = await server.ssrLoadModule('/src/utils/mediaUrl.js');
    assert.equal(media.resolveOriginalFrameUrl({ face_crop_path: 'uploads/face.jpg' }), null);
    assert.equal(media.resolveOriginalFaceUrl({ first_frame_path: 'uploads/frame.jpg' }), null);
    assert.equal(media.resolveOriginalFaceUrl({}), null);
    assert.equal(media.resolveMediaUrl({ invalid: true }), '');
  } finally { await server.close(); }
});
