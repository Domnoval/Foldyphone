/* The arithmetic every build plan shares. A plan is a function from parameters to a list of parts;
   everything here is derived from that list, never typed by hand.

   Units: decimal inches in, sixteenths out. Round only at display.
   Part dimensions are final. Kerf lives in the stock layout, it never shortens a part. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Lumber = api;
})(typeof self !== 'undefined' ? self : this, function () {

  /* Actual sizes. Nominal names lie; the saw does not. Thickness is worth checking with calipers. */
  const board = (t, w) => ({ kind: 'board', t, w });
  const sheet = (t) => ({ kind: 'sheet', t, w: 48, l: 96 });
  const STOCK = {
    '1x2': board(0.75, 1.5), '1x3': board(0.75, 2.5), '1x4': board(0.75, 3.5), '1x6': board(0.75, 5.5),
    '1x8': board(0.75, 7.25), '1x10': board(0.75, 9.25), '1x12': board(0.75, 11.25),
    '2x2': board(1.5, 1.5), '2x3': board(1.5, 2.5), '2x4': board(1.5, 3.5), '2x6': board(1.5, 5.5),
    '2x8': board(1.5, 7.25), '2x10': board(1.5, 9.25), '2x12': board(1.5, 11.25),
    '4x4': board(3.5, 3.5),
    'ply-1/4': sheet(7 / 32), 'ply-1/2': sheet(15 / 32), 'ply-3/4': sheet(23 / 32),
  };

  /* 23.625 -> 23 5/8"   Rounds to the nearest 1/denom. */
  function frac(inches, denom = 16) {
    const sign = inches < 0 ? '-' : '';
    let n = Math.round(Math.abs(inches) * denom);
    const whole = Math.floor(n / denom);
    n -= whole * denom;
    if (n === 0) return `${sign}${whole}"`;
    let d = denom;
    while (n % 2 === 0) { n /= 2; d /= 2; }
    return `${sign}${whole ? whole + ' ' : ''}${n}/${d}"`;
  }

  /* Identical parts collapse to one row: cut them against a stop, not a tape. */
  function cutList(parts) {
    const rows = new Map();
    for (const p of parts) {
      const key = [p.stock, p.length.toFixed(4), p.cut || ''].join('|');
      if (!rows.has(key)) rows.set(key, { stock: p.stock, length: p.length, cut: p.cut || '', role: p.role, qty: 0, ids: [] });
      const r = rows.get(key);
      r.qty += 1;
      r.ids.push(p.id);
    }
    return [...rows.values()].sort((a, b) => a.stock.localeCompare(b.stock) || b.length - a.length);
  }

  /* First-fit-decreasing, per stock type, against the lengths you can actually buy.
     Each board loses `trim` squaring a factory end; each part costs its length plus one kerf. */
  function packLinear(parts, { lengths = [96], kerf = 0.125, trim = 0.25 } = {}) {
    const buyable = [...lengths].sort((a, b) => a - b);
    const longest = buyable[buyable.length - 1];
    const byStock = new Map();
    for (const p of parts) {
      if (!byStock.has(p.stock)) byStock.set(p.stock, []);
      byStock.get(p.stock).push(p);
    }
    const out = [];
    for (const [stock, group] of byStock) {
      const boards = [];
      for (const p of [...group].sort((a, b) => b.length - a.length)) {
        const need = p.length + kerf;
        if (need > longest - trim) {
          throw new Error(`${p.id} is ${frac(p.length)} and no ${stock} you can buy is long enough (${frac(longest)}).`);
        }
        let b = boards.find((x) => x.used + need <= longest - trim);
        if (!b) boards.push(b = { used: 0, cuts: [] });
        b.used += need;
        b.cuts.push({ id: p.id, length: p.length });
      }
      /* buy the shortest board that still holds what landed on it */
      for (const b of boards) {
        b.length = buyable.find((L) => b.used <= L - trim);
        b.waste = b.length - b.cuts.reduce((s, c) => s + c.length, 0);
        delete b.used;
      }
      out.push({ stock, boards, count: boards.length });
    }
    return out.sort((a, b) => a.stock.localeCompare(b.stock));
  }

  /* Checks. Parts carry an axis-aligned box: { min: [x,y,z], max: [x,y,z] }.
     Faces that touch are a joint. Volumes that share space are a mistake. */
  function overlaps(parts, eps = 1 / 64) {
    const hits = [];
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i].box, b = parts[j].box;
        if (!a || !b) continue;
        const depth = [0, 1, 2].map((k) => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]));
        if (depth.every((d) => d > eps)) hits.push({ a: parts[i].id, b: parts[j].id, depth: Math.min(...depth) });
      }
    }
    return hits;
  }

  function envelope(parts) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const p of parts) {
      if (!p.box) continue;
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p.box.min[k]);
        max[k] = Math.max(max[k], p.box.max[k]);
      }
    }
    return { min, max, size: max.map((v, k) => v - min[k]) };
  }


  /* Flat geometry. Most furniture parts are a side profile pushed sideways: a convex polygon in the
     side plane plus a span across the width. Raked parts make bounding boxes lie, so these work on
     the real outline. */
  const signedArea = (p) => p.reduce((a, [x1, y1], i) => {
    const [x2, y2] = p[(i + 1) % p.length];
    return a + (x1 * y2 - x2 * y1) / 2;
  }, 0);
  const ccw = (p) => (signedArea(p) < 0 ? [...p].reverse() : p);
  const polyArea = (p) => (p.length < 3 ? 0 : Math.abs(signedArea(p)));
  function polyCentroid(p) {
    const a = signedArea(p);
    let cx = 0, cy = 0;
    p.forEach(([x1, y1], i) => {
      const [x2, y2] = p[(i + 1) % p.length];
      const f = x1 * y2 - x2 * y1;
      cx += (x1 + x2) * f;
      cy += (y1 + y2) * f;
    });
    return [cx / (6 * a), cy / (6 * a)];
  }

  /* The shared region of two convex outlines (Sutherland-Hodgman). A lap joint's glue area. */
  function clipConvex(subject, clip) {
    let out = ccw(subject);
    const c = ccw(clip);
    for (let i = 0; i < c.length && out.length; i++) {
      const a = c[i], b = c[(i + 1) % c.length];
      const side = (q) => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
      const input = out;
      out = [];
      input.forEach((p, j) => {
        const q = input[(j + 1) % input.length];
        const sp = side(p), sq = side(q);
        if (sp >= 0) out.push(p);
        if ((sp >= 0) !== (sq >= 0)) {
          const t = sp / (sp - sq);
          out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
        }
      });
    }
    return out;
  }

  /* How far two convex outlines sink into each other; zero or less means they only touch or miss. */
  function penetration(pa, pb) {
    let least = Infinity;
    for (const poly of [pa, pb]) {
      for (let i = 0; i < poly.length; i++) {
        const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len < 1e-9) continue;
        const nx = (y2 - y1) / len, ny = -(x2 - x1) / len;
        const span = (q) => q.reduce(([lo, hi], [x, y]) => {
          const d = x * nx + y * ny;
          return [Math.min(lo, d), Math.max(hi, d)];
        }, [Infinity, -Infinity]);
        const [a0, a1] = span(pa), [b0, b1] = span(pb);
        least = Math.min(least, Math.min(a1, b1) - Math.max(a0, b0));
      }
    }
    return least;
  }

  /* Parts as prisms: { id, poly: [[u,v],...], x: [x0,x1] }. Same rule as overlaps(): touching is fine. */
  function prismOverlaps(parts, eps = 1 / 64) {
    const hits = [];
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i], b = parts[j];
        const dx = Math.min(a.x[1], b.x[1]) - Math.max(a.x[0], b.x[0]);
        if (dx <= eps) continue;
        const depth = Math.min(dx, penetration(a.poly, b.poly));
        if (depth > eps) hits.push({ a: a.id, b: b.id, depth });
      }
    }
    return hits;
  }

  /* Measure both diagonals of a frame. Equal means square. This is what they should read. */
  const diagonal = (a, b) => Math.hypot(a, b);

  return { STOCK, frac, cutList, packLinear, overlaps, envelope, diagonal, polyArea, polyCentroid, clipConvex, penetration, prismOverlaps };
});
