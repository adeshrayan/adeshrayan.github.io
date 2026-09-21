/* ============================================================
   marks.js — everything that should look like a human did it
   with a marker: outlines, underlines, arrows, stars, circles,
   torn paper, tape, crop marks.
   Nothing here is a clean vector. That's the point.
   ============================================================ */

/* ---- Wobble ------------------------------------------------
   Perturbs a point list so a "straight" line never is. */
function wobble(pts, amp = 3, seed = 1) {
  return pts.map((p, i) => [
    p[0] + jit(i * 7 + 1, seed) * amp,
    p[1] + jit(i * 7 + 2, seed) * amp
  ]);
}

/* ---- Marker stroke -----------------------------------------
   Multi-pass with varying pressure + slight overshoot, so the
   ends look like a pen leaving the paper, not a path ending.
   `grow` in 0..1 animates it as if being drawn. */
function marker(ctx, pts, {
  color = C.red, width = 7, amp = 3.2, seed = 1, passes = 2,
  grow = 1, closed = false, overshoot = true
} = {}) {
  if (pts.length < 2 || grow <= 0) return;

  let p = wobble(pts, amp, seed);
  if (closed) p = p.concat([p[0], p[1]]);

  // overshoot: extend slightly past the final point
  if (overshoot && !closed && p.length > 1) {
    const a = p[p.length - 2], b = p[p.length - 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const m = Math.hypot(dx, dy) || 1;
    p = p.concat([[b[0] + dx / m * (5 + hash(seed, 9) * 9), b[1] + dy / m * (5 + hash(seed, 9) * 9)]]);
  }

  // how much of the path to draw
  const total = p.length - 1;
  const upTo = clamp(grow, 0, 1) * total;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;

  for (let pass = 0; pass < passes; pass++) {
    ctx.globalAlpha = pass === 0 ? 0.95 : 0.40;
    ctx.lineWidth = width * (pass === 0 ? 1 : 0.62);
    const off = pass === 0 ? 0 : jit(seed + pass, 31) * 2.4;
    ctx.beginPath();
    for (let i = 0; i <= Math.floor(upTo); i++) {
      const pt = p[i];
      const x = pt[0] + off, y = pt[1] + off * 0.6;
      if (i === 0) ctx.moveTo(x, y);
      else {
        // quadratic through midpoints = organic, not polygonal
        const prev = p[i - 1];
        const mx = (prev[0] + pt[0]) / 2 + off, my = (prev[1] + pt[1]) / 2 + off * 0.6;
        ctx.quadraticCurveTo(prev[0] + off, prev[1] + off * 0.6, mx, my);
      }
    }
    // partial final segment
    const fi = Math.floor(upTo);
    if (fi < total) {
      const a = p[fi], b = p[fi + 1], t = upTo - fi;
      ctx.lineTo(lerp(a[0], b[0], t) + off, lerp(a[1], b[1], t) + off * 0.6);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* ---- Irregular outline around a box -------------------------
   The "drawn around the subject with a marker" treatment. */
function outlineBox(ctx, x, y, w, h, opts = {}) {
  const seed = opts.seed || 5;
  const pad = opts.pad === undefined ? 12 : opts.pad;
  const per = 7;   // points per edge
  const pts = [];
  const push = (ax, ay, bx, by) => {
    for (let i = 0; i < per; i++) pts.push([lerp(ax, bx, i / per), lerp(ay, by, i / per)]);
  };
  const L = x - pad, T = y - pad, R = x + w + pad, B = y + h + pad;
  push(L, T, R, T); push(R, T, R, B); push(R, B, L, B); push(L, B, L, T);
  marker(ctx, pts, { closed: true, amp: 4.4, seed, width: opts.width || 6, ...opts });
}

/* ---- Underline ---------------------------------------------- */
function underline(ctx, x, y, w, opts = {}) {
  const n = 9, pts = [];
  for (let i = 0; i <= n; i++) {
    pts.push([x + (w * i / n), y + Math.sin(i / n * Math.PI) * -2.6]);
  }
  marker(ctx, pts, { amp: 2.8, width: opts.width || 9, ...opts });
}

/* ---- Circle-an-element (annotation) -------------------------- */
function circleMark(ctx, cx, cy, rx, ry, opts = {}) {
  const n = 26, pts = [];
  const start = rad(opts.startDeg || -20);
  const sweep = rad(opts.sweepDeg || 380);   // >360 = overlap, like a real scribbled ring
  for (let i = 0; i <= n; i++) {
    const a = start + sweep * (i / n);
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  marker(ctx, pts, { amp: 3.6, width: opts.width || 6, ...opts });
}

/* ---- Arrow --------------------------------------------------- */
function arrow(ctx, x1, y1, x2, y2, opts = {}) {
  const n = 8, pts = [];
  const bow = opts.bow === undefined ? 16 : opts.bow;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const nx = -(y2 - y1), ny = (x2 - x1);
    const m = Math.hypot(nx, ny) || 1;
    const b = Math.sin(t * Math.PI) * bow;
    pts.push([lerp(x1, x2, t) + nx / m * b, lerp(y1, y2, t) + ny / m * b]);
  }
  marker(ctx, pts, { amp: 2.4, width: opts.width || 5, overshoot: false, ...opts });

  if ((opts.grow === undefined ? 1 : opts.grow) > 0.82) {
    // head
    const a = Math.atan2(y2 - y1, x2 - x1);
    const hl = opts.head || 24;
    [-1, 1].forEach((s, k) => {
      const aa = a + s * rad(150);
      marker(ctx, [[x2, y2], [x2 + Math.cos(aa) * hl, y2 + Math.sin(aa) * hl]],
        { amp: 1.8, width: opts.width || 5, seed: (opts.seed || 1) + 40 + k, overshoot: false, color: opts.color || C.red, passes: 1 });
    });
  }
}

/* ---- Star / sparkle ★ ---------------------------------------- */
function star(ctx, cx, cy, r0, opts = {}) {
  const col = opts.color || C.ink;
  const rot = rad(opts.rot || 0);
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = col;
  ctx.globalAlpha *= (opts.alpha === undefined ? 1 : opts.alpha);
  ctx.beginPath();
  const pts = opts.points || 5;
  for (let i = 0; i < pts * 2; i++) {
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r0 * (opts.inner || 0.42) : r0;
    const w2 = 1 + jit(i, opts.seed || 3) * 0.06;
    i ? ctx.lineTo(Math.cos(a) * rr * w2, Math.sin(a) * rr * w2)
      : ctx.moveTo(Math.cos(a) * rr * w2, Math.sin(a) * rr * w2);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ---- Four-point sparkle ✦ ------------------------------------ */
function sparkle(ctx, cx, cy, r0, opts = {}) {
  star(ctx, cx, cy, r0, { points: 4, inner: 0.22, ...opts });
}

/* ---- Crop / registration marks -------------------------------- */
function cropMarks(ctx, x, y, w, h, opts = {}) {
  const L = opts.len || 22, g = opts.gap || 9;
  ctx.save();
  ctx.strokeStyle = opts.color || C.ink;
  ctx.globalAlpha *= (opts.alpha === undefined ? 0.55 : opts.alpha);
  ctx.lineWidth = opts.width || 1.6;
  const corner = (cx, cy, sx, sy) => {
    ctx.beginPath();
    ctx.moveTo(cx + sx * g, cy); ctx.lineTo(cx + sx * (g + L), cy);
    ctx.moveTo(cx, cy + sy * g); ctx.lineTo(cx, cy + sy * (g + L));
    ctx.stroke();
  };
  corner(x, y, -1, -1); corner(x + w, y, 1, -1);
  corner(x, y + h, -1, 1); corner(x + w, y + h, 1, 1);
  ctx.restore();
}

/* ---- Registration target (the little crosshair ring) ---------- */
function regTarget(ctx, cx, cy, r0 = 13, opts = {}) {
  ctx.save();
  ctx.strokeStyle = opts.color || C.ink;
  ctx.globalAlpha *= (opts.alpha === undefined ? 0.5 : opts.alpha);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r0 * 1.7, cy); ctx.lineTo(cx + r0 * 1.7, cy);
  ctx.moveTo(cx, cy - r0 * 1.7); ctx.lineTo(cx, cy + r0 * 1.7);
  ctx.stroke();
  ctx.restore();
}

/* ---- Torn paper edge ------------------------------------------
   Returns a path along y with fibrous tearing. Used for the
   black strips that carry white type. */
function tornEdgePath(ctx, x0, x1, y, amp = 9, seed = 2, step = 13) {
  ctx.lineTo(x0, y);
  for (let x = x0; x <= x1; x += step) {
    const n = noise1(x / 44, seed) - 0.5;
    const spike = hash(Math.floor(x / step), seed + 77) > 0.88 ? jit(x, seed + 5) * amp * 1.5 : 0;
    ctx.lineTo(x, y + n * amp * 2 + spike);
  }
  ctx.lineTo(x1, y);
}

/* Draw a torn horizontal strip. Returns its bounds. */
function tornStrip(ctx, x, y, w, h, opts = {}) {
  const seed = opts.seed || 11;
  const amp = opts.amp || 8;
  ctx.save();
  if (opts.shadow !== false) {
    ctx.shadowColor = 'rgba(20,18,14,0.30)';
    ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  }
  ctx.fillStyle = opts.color || C.ink;
  ctx.beginPath();
  ctx.moveTo(x, y);
  tornEdgePath(ctx, x, x + w, y, amp, seed);
  ctx.lineTo(x + w, y + h);
  tornEdgePath(ctx, x + w, x, y + h, amp, seed + 31, -13);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return { x, y, w, h };
}

/* ---- Tape ------------------------------------------------------
   Translucent strip with torn ends — for holding photos down. */
function tape(ctx, cx, cy, w, h, rot = 0, opts = {}) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rad(rot));
  ctx.globalAlpha *= (opts.alpha === undefined ? 0.55 : opts.alpha);
  ctx.fillStyle = opts.color || 'rgba(232,229,216,0.92)';
  ctx.beginPath();
  const hw = w / 2, hh = h / 2, s = opts.seed || 13;
  ctx.moveTo(-hw, -hh);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-hw + w * i / 6, -hh + jit(i, s) * 2.2);
  for (let i = 0; i <= 4; i++) ctx.lineTo(hw + jit(i, s + 3) * 3.4, -hh + h * i / 4);
  for (let i = 6; i >= 0; i--) ctx.lineTo(-hw + w * i / 6, hh + jit(i, s + 6) * 2.2);
  for (let i = 4; i >= 0; i--) ctx.lineTo(-hw + jit(i, s + 9) * 3.4, -hh + h * i / 4);
  ctx.closePath(); ctx.fill();
  // slight sheen
  ctx.globalAlpha *= 0.5;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(-hw, -hh, w, h * 0.3);
  ctx.restore();
}
