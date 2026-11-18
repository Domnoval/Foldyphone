const test = require('node:test');
const assert = require('node:assert/strict');
const Lumber = require('../../kit/lumber.js');
const { build, CONTROLS } = require('./model.js');

const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;

test('default design passes its own checks', () => {
  const m = build();
  const failed = m.checks.filter((c) => !c.ok);
  assert.deepEqual(failed.map((c) => c.text), []);
});

test('it is a 48 in wide seat on three identical frames', () => {
  const m = build();
  assert.equal(m.overall.width, 48);
  for (const role of ['rail', 'leg', 'runner']) {
    const set = m.parts.filter((p) => p.role === role);
    assert.equal(set.length, 3);
    assert.ok(set.every((p) => near(p.length, set[0].length) && p.cut === set[0].cut));
  }
});

test('legs are a full 3 1/2 wide and stand on the floor', () => {
  const m = build({ legRake: 30, tilt: 9 });
  const leg = m.parts.find((p) => p.id === 'leg-L');
  const [, , rb, fb] = leg.poly;
  assert.ok(near(rb[1], 0) && near(fb[1], 0));
  assert.ok(near((rb[0] - fb[0]) * Math.cos((30 * Math.PI) / 180), 3.5));
});

test('the back hangs clear of the floor and its stringers meet the rails', () => {
  const m = build();
  const stringer = m.parts.find((p) => p.id === 'back-stringer-L');
  assert.ok(near(Math.min(...stringer.poly.map((q) => q[1])), 0.5));
  assert.equal(m.laps.length, 12);
  assert.ok(m.laps.every((l) => l.area > 8 && l.at));
});

test('a seat asked for too low is raised until the rail clears the runner', () => {
  const m = build({ seatHeight: 15, tilt: 10 });
  assert.ok(m.d.raised);
  assert.ok(m.d.seatFront > 15);
  assert.ok(near(m.d.railGap, 0, 1e-6));
  assert.equal(Lumber.prismOverlaps(m.parts).length, 0);
});

test('nothing collides anywhere the sliders can reach', () => {
  const span = (c, n) => Array.from({ length: n }, (_, i) => c.min + ((c.max - c.min) * i) / (n - 1));
  const [tilt, height, back, leg] = CONTROLS;
  let seen = 0;
  for (const t of span(tilt, 4)) for (const h of span(height, 3)) for (const b of span(back, 4)) for (const l of span(leg, 4)) {
    for (const deck of [0.5, 0.75]) {
      const m = build({ tilt: t, seatHeight: h, backRake: b, legRake: l, deck });
      const hits = Lumber.prismOverlaps(m.parts);
      assert.deepEqual(hits, [], `tilt ${t} height ${h} back ${b} leg ${l} deck ${deck}`);
      seen++;
    }
  }
  assert.equal(seen, 384);
});

test('the cut list and the board count come from the parts', () => {
  const m = build();
  const rows = Lumber.cutList(m.lumber);
  assert.deepEqual(rows.map((r) => r.qty).sort(), [1, 3, 3, 3]);
  const [{ count }] = Lumber.packLinear(m.lumber, { lengths: [96] });
  assert.equal(count, 4);
});

test('changing a slider moves the cut list', () => {
  const a = build(), b = build({ legRake: 10 });
  const leg = (m) => m.parts.find((p) => p.id === 'leg-C').length;
  assert.ok(leg(a) > leg(b));
});
