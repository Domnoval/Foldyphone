const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./lumber.js');
const { classify } = require('./fold.js');

test('frac rounds to sixteenths and reduces', () => {
  assert.equal(L.frac(23.625), '23 5/8"');
  assert.equal(L.frac(0.75), '3/4"');
  assert.equal(L.frac(24), '24"');
  assert.equal(L.frac(23.99), '24"');       // carries into the whole number
  assert.equal(L.frac(23 / 32), '3/4"');    // "3/4" ply, at tape resolution
  assert.equal(L.frac(23 / 32, 32), '23/32"');
  assert.equal(L.frac(0), '0"');
});

test('stock is actual, not nominal', () => {
  assert.deepEqual([L.STOCK['2x4'].t, L.STOCK['2x4'].w], [1.5, 3.5]);
  assert.equal(L.STOCK['ply-3/4'].t, 23 / 32);
});

test('cut list collapses identical parts and keeps their ids', () => {
  const rows = L.cutList([
    { id: 'leg-1', role: 'leg', stock: '2x4', length: 16 },
    { id: 'leg-2', role: 'leg', stock: '2x4', length: 16 },
    { id: 'rail-1', role: 'rail', stock: '2x4', length: 48 },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].length, 48);
  assert.deepEqual(rows[1].ids, ['leg-1', 'leg-2']);
});

test('packing charges kerf to the board, never to the part', () => {
  const parts = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, stock: '2x4', length: 30 }));
  const [{ boards, count }] = L.packLinear(parts, { lengths: [96] });
  assert.equal(count, 2);                                  // three 30s fit in 96, a fourth does not
  assert.deepEqual(boards.map((b) => b.cuts.length), [3, 2]);
  assert.ok(boards.every((b) => b.cuts.every((c) => c.length === 30)));
  assert.equal(boards[0].waste, 6);
});

test('packing buys the shortest board that holds the cuts', () => {
  const opts = { lengths: [96, 120, 144] };
  const [long] = L.packLinear([{ id: 'a', stock: '1x4', length: 100 }], opts);
  assert.deepEqual(long.boards.map((b) => b.length), [120]);
  // it fills a board before opening another, so these two share one 12-footer
  const [pair] = L.packLinear([{ id: 'a', stock: '1x4', length: 100 }, { id: 'b', stock: '1x4', length: 40 }], opts);
  assert.deepEqual(pair.boards.map((b) => b.length), [144]);
});

test('packing refuses a part longer than any board', () => {
  assert.throws(() => L.packLinear([{ id: 'beam', stock: '2x6', length: 96 }], { lengths: [96] }), /beam/);
});

test('touching faces are a joint, shared volume is a mistake', () => {
  const box = (id, x0, x1) => ({ id, box: { min: [x0, 0, 0], max: [x1, 3.5, 1.5] } });
  assert.deepEqual(L.overlaps([box('a', 0, 10), box('b', 10, 20)]), []);
  assert.equal(L.overlaps([box('a', 0, 10), box('b', 9, 20)])[0].depth, 1);
});

test('envelope sums the parts', () => {
  const e = L.envelope([{ box: { min: [0, 0, 0], max: [48, 3.5, 1.5] } }, { box: { min: [0, 0, 1.5], max: [1.5, 3.5, 30] } }]);
  assert.deepEqual(e.size, [48, 3.5, 30]);
});

test('lap area and centroid of two crossing boards', () => {
  const flat = [[0, 0], [10, 0], [10, 3.5], [0, 3.5]];
  const upright = [[4, -5], [7.5, -5], [7.5, 9], [4, 9]];
  const lap = L.clipConvex(flat, upright);
  assert.ok(Math.abs(L.polyArea(lap) - 12.25) < 1e-9);
  const [cx, cy] = L.polyCentroid(lap);
  assert.ok(Math.abs(cx - 5.75) < 1e-9 && Math.abs(cy - 1.75) < 1e-9);
  assert.equal(L.polyArea(L.clipConvex(flat, [[20, 0], [21, 0], [21, 1]])), 0);
});

test('raked parts are judged by their real outline, not their bounding box', () => {
  // two parallel boards leaning at 45 degrees, a clear gap between them: their boxes overlap, they do not
  const lean = (off) => [[off, 0], [off + 2, 0], [off + 12, 10], [off + 10, 10]];
  const a = { id: 'a', poly: lean(0), x: [0, 1.5] }, b = { id: 'b', poly: lean(3), x: [0, 1.5] };
  assert.deepEqual(L.prismOverlaps([a, b]), []);
  assert.equal(L.prismOverlaps([a, { id: 'c', poly: lean(1), x: [0, 1.5] }]).length, 1);
  // same outline, side by side across the width: a lap joint, not a collision
  assert.deepEqual(L.prismOverlaps([a, { id: 'd', poly: lean(0), x: [1.5, 3] }]), []);
});

test('posture follows the same rules as fold.css', () => {
  assert.equal(classify({ w: 344 }), 'cover');
  assert.equal(classify({ w: 690 }), 'open');
  assert.equal(classify({ w: 690, folded: true }), 'open');                  // book-style half fold stays two leaves
  assert.equal(classify({ w: 829, folded: true, landscape: true }), 'flex');
  assert.equal(classify({ w: 829, rows: 2 }), 'flex');
});
