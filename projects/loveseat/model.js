/* Pallet loveseat: parameters in, parts out. Every number on the plan comes from build().

   Side plane: u runs front to back, v runs up from the floor. x runs across the width, 0 to 48.
   Every part is a side profile (a convex outline in u,v) pushed across a span of x.

   The idea: both pallets stay whole. Three identical side frames carry them. A frame has two
   layers, side by side: the rail and the runner in one, the leg and the back pallet's own
   stringer in the other. Where two layers cross they lap, face to face, and get bolted. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('../../kit/lumber.js') : root.Lumber);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Loveseat = api;
})(typeof self !== 'undefined' ? self : this, function (Lumber) {
  const { frac, clipConvex, polyArea, polyCentroid } = Lumber;
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (n) => `${Math.round(n * 2) / 2}°`;

  const CONTROLS = [
    { key: 'tilt', label: 'Seat tilt', unit: '°', min: 3, max: 12, step: 0.5, value: 7 },
    { key: 'seatHeight', label: 'Seat height, front edge', unit: 'in', min: 15, max: 22, step: 0.25, value: 17.5 },
    { key: 'backRake', label: 'Back lean', unit: '°', min: 10, max: 30, step: 1, value: 20 },
    { key: 'legRake', label: 'Leg rake', unit: '°', min: 0, max: 35, step: 1, value: 25 },
    { key: 'deck', label: 'Deck board thickness', unit: 'in', min: 0.5, max: 0.75, step: 0.0625, value: 0.625, measured: true },
    { key: 'stringer', label: 'Stringer height', unit: 'in', min: 3.25, max: 3.75, step: 0.125, value: 3.5, measured: true },
  ];
  const DEFAULTS = Object.fromEntries(CONTROLS.map((c) => [c.key, c.value]));

  const ROLES = {
    pallet: 'Pallets, as found',
    moved: 'Board moved up',
    rail: 'Rail',
    leg: 'Leg',
    runner: 'Runner',
    spreader: 'Spreader',
    bolt: 'Carriage bolt',
  };

  const W = 48, D = 40;            // seat pallet: stringers run across, deck boards run front to back
  const WB = 40, LB = 48;          // back pallet: stringers run up, deck boards run across
  const SW = 1.5;                  // stringer thickness
  const B = Lumber.STOCK['2x4'];   // new lumber: 1.5 x 3.5
  const BOARD = 5.5;               // deck board width, read off the photo
  const CLEAR = 0.5;               // back stringers hang this far off the floor
  const TAIL = 6;                  // runner continues this far behind the back
  const DENSITY = 0.016;           // lb per cubic inch, dry softwood. An estimate.

  /* Where the boards sit on the back pallet, measured up its stringers. Read off the photo. */
  const BACK_BOARDS = [[0.5, 2.5], [5.25, 10.75], [17.5, 23], [30, 35.5], [42.5, 48]];

  /* Left and centre frames are the same hand. The right one is a mirror. */
  const FRAMES = [
    { id: 'L', name: 'left', a: [2.5, 4], b: [4, 5.5] },
    { id: 'C', name: 'centre', a: [21.75, 23.25], b: [23.25, 24.75] },
    { id: 'R', name: 'right', a: [44, 45.5], b: [42.5, 44] },
  ];

  function geometry(p, Hf) {
    const th = rad(p.tilt), ph = rad(p.backRake), rh = rad(p.legRake);
    const tb = p.deck, sh = p.stringer, T = sh + 2 * tb;
    /* seat space: s back from the front edge along the slope, t down from the seat top */
    const Pt = (s, t) => [s * Math.cos(th) - t * Math.sin(th), Hf - s * Math.sin(th) - t * Math.cos(th)];
    const R = Pt(D, 0);
    /* The back's stringers stand off the seat's rear edge far enough to clear both its top corner
       (past the back boards) and its bottom corner. With the default angles they touch the bottom corner. */
    const off = Math.max(T * Math.sin(ph - th), tb + 0.25);
    const Ov = CLEAR + (tb + sh) * Math.sin(ph);
    const K = R[0] * Math.cos(ph) - R[1] * Math.sin(ph) + off - tb;
    const Ou = (K + Ov * Math.sin(ph)) / Math.cos(ph);
    /* back space: q up the stringer from its foot, r back from the board face */
    const Bp = (q, r) => [Ou + q * Math.sin(ph) + r * Math.cos(ph), Ov + q * Math.cos(ph) - r * Math.sin(ph)];
    const seatLine = (R[0] - Ou) * Math.sin(ph) + (R[1] - Ov) * Math.cos(ph);
    /* rail: under the pallet, running back until it is flush with the rear face of the back stringer */
    const railEnd = (t) => (tb + sh + K + Hf * Math.sin(ph) - t * Math.sin(ph - th)) / Math.cos(ph - th);
    const sTop = railEnd(T), sBot = railEnd(T + B.w);
    const rail = [Pt(0, T), Pt(sTop, T), Pt(sBot, T + B.w), Pt(0, T + B.w)];
    return { th, ph, rh, tb, sh, T, Pt, R, Bp, K, seatLine, sTop, sBot, rail, railLow: rail[2][1] };
  }

  function build(input = {}) {
    const p = { ...DEFAULTS, ...input };
    /* The rail and the runner share a layer. If the asked-for seat is too low for the tilt, the rail
       would run into the runner at the back, so the seat rises until they just meet. */
    let Hf = p.seatHeight, g = geometry(p, Hf);
    for (let i = 0; i < 8 && g.railLow < B.w - 1e-9; i++) { Hf += B.w - g.railLow; g = geometry(p, Hf); }
    const raised = Hf - p.seatHeight > 1e-6;
    const { th, ph, rh, tb, sh, T, Pt, R, Bp, K, seatLine, sTop, sBot } = g;

    const parts = [];
    const add = (part) => { parts.push({ found: false, explode: [0, 0, 0], ...part }); return part; };
    const seatRect = (s0, s1, t0, t1) => [Pt(s0, t0), Pt(s1, t0), Pt(s1, t1), Pt(s0, t1)];
    const backRect = (q0, q1, r0, r1) => [Bp(q0, r0), Bp(q1, r0), Bp(q1, r1), Bp(q0, r1)];

    /* ---- seat pallet, as found ---- */
    const up = [0, 1, 0];
    [0, 1, 2, 3, 4].forEach((i) => {
      const x0 = (i * (W - BOARD)) / 4;
      add({ id: `seat-top-${i + 1}`, name: 'Seat deck board', role: 'pallet', found: true, step: 5, poly: seatRect(0, D, 0, tb), x: [x0, x0 + BOARD], explode: up });
    });
    [[0, SW, 'front'], [D / 2 - SW / 2, D / 2 + SW / 2, 'middle'], [D - SW, D, 'rear']].forEach(([s0, s1, where]) => {
      add({ id: `seat-stringer-${where}`, name: `Seat stringer, ${where}`, role: 'pallet', found: true, step: 5, poly: seatRect(s0, s1, tb, tb + sh), x: [0, W], explode: up });
    });
    [0, (W - BOARD) / 2, W - BOARD].forEach((x0, i) => {
      add({ id: `seat-bottom-${i + 1}`, name: 'Seat bottom board', role: 'pallet', found: true, step: 5, poly: seatRect(0, D, tb + sh, T), x: [x0, x0 + BOARD], explode: up });
    });

    /* ---- back pallet, as found, minus what falls below the seat ---- */
    const away = [0, 0.45, 1];
    const x0b = (W - WB) / 2;
    FRAMES.forEach((f) => {
      add({ id: `back-stringer-${f.id}`, name: `Back stringer, ${f.name}`, role: 'pallet', found: true, step: 6, frame: f.id, poly: backRect(0, LB, tb, tb + sh), x: f.b, explode: away });
    });
    const kept = BACK_BOARDS.filter(([q0]) => q0 >= seatLine + 0.5);
    const removed = BACK_BOARDS.filter(([q0]) => q0 < seatLine + 0.5);
    kept.forEach(([q0, q1], i) => {
      add({ id: `back-board-${i + 1}`, name: 'Back board', role: 'pallet', found: true, step: 6, poly: backRect(q0, q1, 0, tb), x: [x0b, x0b + WB], explode: away });
    });
    /* the widest board that came off goes back on, centred in the gap just above the seat */
    const spare = removed.find(([q0, q1]) => q1 - q0 >= BOARD - 0.01);
    const room = (kept.length ? kept[0][0] : LB) - seatLine;
    let moved = null;
    if (spare && room >= BOARD + 0.75) {
      const q0 = seatLine + (room - BOARD) / 2;
      moved = add({ id: 'back-board-moved', name: 'Back board, moved up', role: 'moved', found: true, step: 7, poly: backRect(q0, q0 + BOARD, 0, tb), x: [x0b, x0b + WB], explode: away, above: q0 - seatLine });
    }

    /* ---- the three frames, new 2x4 ---- */
    const F = Pt(0, T);
    const lam = B.w / Math.cos(th + rh);
    const Ft = Pt(lam, T);
    const fb = [F[0] + F[1] * Math.tan(rh), 0];
    const rb = [Ft[0] + Ft[1] * Math.tan(rh), 0];
    const leg = [F, Ft, rb, fb];
    const legLong = F[1] / Math.cos(rh), legShort = Ft[1] / Math.cos(rh);

    const rearAt = (v) => (K + tb + sh + v * Math.sin(ph)) / Math.cos(ph) + TAIL;
    const runner = [fb, [rearAt(0), 0], [rearAt(B.w), B.w], [fb[0] - B.w * Math.tan(rh), B.w]];
    const runLong = runner[2][0] - runner[3][0], runShort = runner[1][0] - runner[0][0];

    const railMiter = Math.abs(p.backRake - p.tilt), legTop = p.tilt + p.legRake;
    const cuts = {
      rail: `Front end square. Rear end ${deg(railMiter)} on the miter saw, long point on the ${ph >= th ? 'top' : 'bottom'} edge.`,
      leg: p.legRake === 0 && p.tilt === 0 ? 'Both ends square.'
        : `Top ${deg(legTop)}, foot ${deg(p.legRake)}. Both cuts lean the same way, so the leg is a parallelogram. Measure along the long edge.`,
      runner: `Front end ${deg(p.legRake)}, rear end ${deg(p.backRake)}. The cuts lean away from each other, so the top edge is the long one.`,
      spreader: 'Both ends square.',
    };

    const laps = [];
    FRAMES.forEach((f, i) => {
      const side = f.id === 'L' ? -1 : f.id === 'R' ? 1 : 0;
      const inward = f.id === 'R' ? -1 : 1;                  // which way the leg layer sits from the rail layer
      const ex = [side, 0, 0], exLeg = [side + inward * 0.5, 0, 0];
      const step = i + 1;
      add({ id: `rail-${f.id}`, name: `Rail, ${f.name}`, role: 'rail', stock: '2x4', frame: f.id, step, poly: g.rail, x: f.a, length: Math.max(sTop, sBot), short: Math.min(sTop, sBot), cut: cuts.rail, explode: ex });
      add({ id: `leg-${f.id}`, name: `Leg, ${f.name}`, role: 'leg', stock: '2x4', frame: f.id, step, poly: leg, x: f.b, length: legLong, short: legShort, cut: cuts.leg, explode: exLeg });
      add({ id: `runner-${f.id}`, name: `Runner, ${f.name}`, role: 'runner', stock: '2x4', frame: f.id, step, poly: runner, x: f.a, length: runLong, short: runShort, cut: cuts.runner, explode: ex });

      const stringer = backRect(0, LB, tb, tb + sh);
      [['leg', 'rail', leg, g.rail, true, step], ['leg', 'runner', leg, runner, true, step],
        ['back', 'rail', stringer, g.rail, false, 6], ['back', 'runner', stringer, runner, false, 6]].forEach(([a, b, pa, pb, glued, at]) => {
        const shared = clipConvex(pa, pb);
        const area = polyArea(shared);
        laps.push({ id: `${a}-${b}-${f.id}`, frame: f.id, a, b, glued, step: at, area, at: area > 0.01 ? polyCentroid(shared) : null, x: [Math.min(f.a[0], f.b[0]), Math.max(f.a[1], f.b[1])] });
      });
    });

    const spreaderU = rb[0] + 0.25;
    const spreaderX = [FRAMES[0].a[0], FRAMES[2].a[1]];
    add({ id: 'spreader', name: 'Spreader', role: 'spreader', stock: '2x4', step: 4, poly: [[spreaderU, B.w], [spreaderU + B.w, B.w], [spreaderU + B.w, B.w + B.t], [spreaderU, B.w + B.t]], x: spreaderX, length: spreaderX[1] - spreaderX[0], short: spreaderX[1] - spreaderX[0], cut: cuts.spreader, explode: [0, -0.5, -0.6] });

    /* ---- derived numbers ---- */
    const all = parts.flatMap((q) => q.poly);
    const us = all.map((q) => q[0]), vs = all.map((q) => q[1]);
    const overall = { width: W, depth: Math.max(...us) - Math.min(...us), height: Math.max(...vs), front: Math.min(...us), rear: Math.max(...us) };

    let weight = 0, moment = 0;
    for (const q of parts) {
      const w = polyArea(q.poly) * (q.x[1] - q.x[0]) * DENSITY;
      weight += w;
      moment += w * polyCentroid(q.poly)[0];
    }
    const cg = moment / weight;
    const frontPivot = fb[0], rearPivot = runner[1][0];
    const perch = 0.75;                                      // someone sitting on the front stringer
    const tipForward = frontPivot > perch + 0.01 ? (weight * (cg - frontPivot)) / (frontPivot - perch) : Infinity;
    const tipBack = (weight * (rearPivot - cg)) / overall.height;

    const backLaps = laps.filter((l) => l.a === 'back' && l.frame === 'C');
    const arm = backLaps.every((l) => l.at) ? Math.hypot(backLaps[0].at[0] - backLaps[1].at[0], backLaps[0].at[1] - backLaps[1].at[1]) : 0;
    const LEAN = 100, leanAt = R[1] + 16;
    const pivotV = backLaps.every((l) => l.at) ? (backLaps[0].at[1] + backLaps[1].at[1]) / 2 : 0;
    const boltShear = arm > 0 ? (LEAN * (leanAt - pivotV)) / 3 / arm : Infinity;

    const d = {
      seatFront: Hf, seatRear: R[1], raised, asked: p.seatHeight,
      seatToBack: 90 + p.backRake - p.tilt,
      railFrontTop: F[1], railGap: g.railLow - B.w,
      footSetback: fb[0] - Math.min(...us),
      seatLine, backAbove: (LB - seatLine) * Math.cos(ph), removed: removed.length, moved,
      overhang: FRAMES[0].a[0], frameSpan: spreaderX[1] - spreaderX[0],
      railMiter, legTop, legFoot: p.legRake, runFront: p.legRake, runRear: p.backRake,
      weight, cg, tipForward, tipBack, boltShear, lean: LEAN, arm,
      legDrift: legLong * Math.tan(rad(0.5)),
    };

    /* ---- what to buy ---- */
    const lumber = parts.filter((q) => q.stock);
    const bolts = laps.length;
    const hardware = [
      { qty: bolts, item: '3/8 × 4 in carriage bolts, hot-dip galvanized, each with a washer and nut', why: 'One through every lap. Galvanized because a porch is damp.' },
      { qty: laps.length * 2 + 12 + (moved ? 6 : 0), item: '2 1/2 in exterior deck screws', why: `Two beside each bolt so a lap cannot pivot (${laps.length * 2}), twelve to hold the seat pallet down${moved ? ', six for the moved board' : ''}.` },
      { qty: 6, item: '3 in exterior deck screws', why: 'Spreader down into the three runners, two each.' },
      { qty: 1, item: 'bottle of waterproof wood glue (Type I, such as Titebond III)', why: 'Leg laps only. The back stays unglued so it can come apart to move.' },
      { qty: 1, item: 'quart of exterior oil or spar urethane, plus 80 and 120 grit paper', why: 'Pallet wood is rough and thirsty. Seal every face, runner bottoms first.' },
    ];

    /* ---- build order ---- */
    const frameStep = (f, mirror) => ({
      title: `Build the ${f.name} frame`,
      parts: [`rail-${f.id}`, `leg-${f.id}`, `runner-${f.id}`],
      body: `Lay the ${f.name} runner and the ${f.name} rail flat on the floor, about where they will end up. Lay the ${f.name} leg across both${mirror ? ', on the opposite face from the first two frames' : ''}. Leg top flush with the top edge of the rail and with the rail's front corner; leg foot flush with the bottom edge of the runner and with the runner's raked front end. Glue both laps. Drive two 2 1/2 in screws through the leg into each, then drill 3/8 in through the middle of each lap and bolt it.`,
      check: `Stand it up. Top front corner of the rail is ${frac(d.railFrontTop)} off the floor. Rear bottom corner of the rail is ${d.railGap < 1 / 32 ? 'touching the runner' : frac(d.railGap) + ' above the runner; wedge a scrap in that gap until the back goes on'}.`,
      why: mirror ? 'The leg has to sit on the inboard side of every frame so the back pallet\'s stringers land against the rails. On the right frame, inboard is the other face.'
        : 'A lap joint puts long grain against long grain. Glue holds there in a way it never does on end grain, and you cut no joinery at all.',
    });
    const steps = [
      frameStep(FRAMES[0], false),
      { ...frameStep(FRAMES[1], false), body: `Build it exactly like the left frame, leg on the same face. Lay it on top of the left frame before the glue grabs: every edge should line up.`, why: 'Stacking one on the other is a faster and truer check than any tape measure.' },
      frameStep(FRAMES[2], true),
      {
        title: 'Stand the frames and tie them together',
        parts: ['spreader'],
        body: `Stand all three frames with the rails on the outside of the two outer frames. Lay the spreader flat across the tops of the three runners, just behind the leg feet, its ends flush with the outside faces of the outer runners. Centre frame: its rail sits ${frac(FRAMES[1].a[0] - FRAMES[0].a[0])} in from the left end of the spreader, measured to the rail's left face. Two 3 in screws down into each runner.`,
        check: `Outside of left runner to outside of right runner is ${frac(d.frameSpan)} at the front and at the back.`,
        why: 'The spreader fixes the spacing so the pallets drop onto rails that are already in the right place.',
      },
      {
        title: 'Seat pallet on',
        parts: parts.filter((q) => q.id.startsWith('seat-')).map((q) => q.id),
        body: `Sand the seat pallet first; it is easier on sawhorses. Set it on the three rails with its front stringer flush with the front ends of the rails and ${frac(d.overhang)} hanging past each outer rail. Reach between the deck boards and drive four 2 1/2 in screws down through each bottom board into the rail under it. If a bottom board is missing there, angle the screws through the stringers instead.`,
        check: `Front edge of the seat is ${frac(d.seatFront)} off the floor, rear edge ${frac(d.seatRear)}.`,
        why: 'The pallet is the thing that keeps the three frames from racking sideways, so it goes on before the back.',
      },
      {
        title: 'Strip the bottom of the back pallet and bolt it on',
        parts: parts.filter((q) => q.id.startsWith('back-') && q.id !== 'back-board-moved').map((q) => q.id),
        body: `Take the lowest ${d.removed} board${d.removed === 1 ? '' : 's'} off the back pallet: slide the reciprocating saw blade behind each board and cut the nails. Stand the pallet behind the seat with its three stringers beside the three rails, resting on a ${frac(CLEAR)} scrap. Lean it back until the stringers touch the rear bottom edge of the seat pallet. Clamp each stringer to its rail and runner. Drill 3/8 in through the middle of each of the six laps and bolt them. No glue. Once it sits right, add two 2 1/2 in screws beside each bolt; back them out again if it ever has to come apart to move.`,
        check: `The top of the back is ${frac(overall.height)} off the floor. Sit down and lean back gently before you trust it.`,
        why: 'Each stringer is held at two heights, rail and runner. The gap between those two bolts is the lever that resists you leaning back, which is why the stringers run all the way down.',
      },
      {
        title: moved ? 'Put the spare board back, then finish' : 'Finish',
        parts: moved ? ['back-board-moved'] : [],
        body: `${moved ? `Screw the wide board you removed back onto the three stringers, ${frac(moved.above)} above the seat, two 2 1/2 in screws per stringer. ` : ''}Sand everything you will touch to 120 grit and break every sharp edge. Seal all faces, the undersides of the runners twice.`,
        check: 'Drag a rag over the seat and the top of the back. If it snags, sand there again.',
        why: moved ? 'That board fills the gap at the small of your back, exactly where the pallet had none.' : 'Pallet wood splinters. The sanding is not optional.',
      },
    ];

    /* ---- checks, run before anything is shown ---- */
    const clashes = Lumber.prismOverlaps(parts);
    const thin = laps.filter((l) => l.area < 8);
    const longest = Math.max(...lumber.map((q) => q.length));
    const steep = Math.max(d.legTop, d.runRear, d.railMiter);
    const checks = [
      { ok: clashes.length === 0, text: clashes.length === 0 ? 'No two parts occupy the same space.' : `Parts collide: ${clashes.slice(0, 3).map((c) => `${c.a} and ${c.b}`).join(', ')}.` },
      { ok: thin.length === 0, text: thin.length === 0 ? `All ${laps.length} lap joints share at least 8 square inches of face.` : `${thin.length} lap joint${thin.length === 1 ? ' is' : 's are'} too small to bolt. Ease the angles.` },
      { ok: longest <= 95.5, text: `Longest new part is ${frac(longest)}. It fits an 8 ft board.` },
      { ok: steep <= 50, text: steep <= 50 ? `Steepest cut is ${deg(steep)}. A miter saw reaches it.` : `One cut is ${deg(steep)}, past what most miter saws swing to. Mark it and use the circular saw.` },
      { ok: d.tipBack >= 30, text: `Empty, it takes about ${Math.round(d.tipBack)} lb pushing back on the top rail to tip it over backward.` },
      { ok: d.tipForward >= 250, text: d.tipForward === Infinity ? 'The feet are under the front edge. It cannot tip forward.' : `Empty, about ${Math.round(d.tipForward)} lb on the very front edge lifts the back off the floor. More leg rake lowers this.` },
      { ok: d.boltShear <= 300, text: `${d.lean} lb of leaning puts about ${Math.round(d.boltShear)} lb across each back bolt. The two bolts on a stringer are ${frac(d.arm)} apart; more apart is stronger.` },
      { ok: true, text: `Half a degree off on a leg cut moves its foot ${frac(d.legDrift, 32)}. Cut all three against one stop and they will at least be wrong together.` },
    ];
    if (raised) checks.unshift({ ok: true, note: true, text: `Seat raised to ${frac(Hf)}. At ${deg(p.tilt)} of tilt the rail would run into the runner any lower.` });

    return { params: p, parts, laps, steps, checks, hardware, lumber, overall, d, frames: FRAMES };
  }

  return { CONTROLS, DEFAULTS, ROLES, FRAMES, build };
});
