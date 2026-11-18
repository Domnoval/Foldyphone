/* Posture reader. Mirrors the media queries in fold.css, so script and layout never disagree.
   Fold.read()     -> { posture, w, h, dpr, devicePosture, segments, hinge, pointer }
   Fold.watch(fn)  -> calls fn(reading) now and whenever the device changes shape */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Fold = api;
})(typeof self !== 'undefined' ? self : this, function (win) {
  const OPEN_MIN = 600;
  const mq = (q) => !!(win.matchMedia && win.matchMedia(q).matches);

  /* Pure, so it can be tested without a browser. */
  function classify({ w, folded = false, landscape = false, rows = 1 }) {
    if (rows === 2 || (folded && landscape)) return 'flex';
    return w >= OPEN_MIN ? 'open' : 'cover';
  }

  function read() {
    const w = win.innerWidth, h = win.innerHeight;
    const api = win.navigator && win.navigator.devicePosture;
    const rows = mq('(vertical-viewport-segments: 2)') ? 2 : 1;
    const cols = mq('(horizontal-viewport-segments: 2)') ? 2 : 1;
    const known = mq('(vertical-viewport-segments: 1)') || rows === 2;
    const folded = api ? api.type === 'folded' : mq('(device-posture: folded)');
    const posture = classify({ w, folded, landscape: w > h, rows });
    return {
      posture, w, h,
      dpr: win.devicePixelRatio || 1,
      devicePosture: api ? api.type : (mq('(device-posture: continuous)') ? 'continuous' : folded ? 'folded' : null),
      segments: known ? { rows, cols } : null,
      /* where the crease runs, as a fraction of the viewport. Measured only if the browser reports segments. */
      hinge: posture === 'flex' ? { axis: 'horizontal', at: 0.5, measured: rows === 2 }
        : posture === 'open' ? { axis: 'vertical', at: 0.5, measured: cols === 2 }
        : null,
      pointer: mq('(pointer: coarse)') ? 'coarse' : 'fine',
    };
  }

  function watch(fn) {
    const fire = () => fn(read());
    win.addEventListener('resize', fire);
    const api = win.navigator && win.navigator.devicePosture;
    if (api && api.addEventListener) api.addEventListener('change', fire);
    fire();
    return () => win.removeEventListener('resize', fire);
  }

  return { OPEN_MIN, classify, read, watch };
});
