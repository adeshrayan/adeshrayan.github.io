/* ============================================================
   core.js — timing, determinism, easing, math.
   Every frame is a PURE FUNCTION of its frame index. No wall
   clock, no Math.random at draw time. Same frame in, same
   pixels out, every single render.
   ============================================================ */

const W = 1080;
const H = 1920;
const FPS = 24;
const BPM = 120;                     // locked grid: 2 beats/sec
const FPB = (FPS * 60) / BPM;        // 12 frames per beat — exact, no drift
const DURATION_S = 21;
const TOTAL = DURATION_S * FPS;      // 504 frames

/* ---- Palette (from the brief, unchanged) ------------------ */
const C = {
  paper:    '#E9E7E0',   // warm off-white
  paper2:   '#DEDCD4',   // second paper tone
  grey:     '#D5D3CC',   // soft grey
  ink:      '#111111',   // charcoal / near-black
  red:      '#FF1E16',   // the ONE accent
  white:    '#F6F5F1'
};

/* ---- Deterministic RNG (mulberry32) -----------------------
   Seeded per call-site so each element has its own stable
   stream of "randomness" that never changes between renders. */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* One-shot deterministic value from an integer key. */
function hash(n, seed = 1) {
  let t = (n + seed * 0x9E3779B9) >>> 0;
  t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
  t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
  return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
}
/* Signed noise in [-1,1] — for jitter. */
function jit(n, seed = 1) { return hash(n, seed) * 2 - 1; }

/* Smooth-ish value noise over frames, for drift/handheld. */
function noise1(x, seed = 1) {
  const i = Math.floor(x), f = x - i;
  const a = hash(i, seed), b = hash(i + 1, seed);
  const u = f * f * (3 - 2 * f);
  return a * (1 - u) + b * u;
}

/* ---- Time helpers ----------------------------------------- */
const sec   = (s) => s * FPS;               // seconds -> frames
const beat  = (b) => Math.round(b * FPB);   // beats   -> frames
const onBeat = (f) => f % FPB === 0;

/* Normalised progress across [from,to] frames, clamped 0..1 */
function span(f, from, to) {
  if (to <= from) return f >= to ? 1 : 0;
  return clamp((f - from) / (to - from), 0, 1);
}

/* ---- Math ------------------------------------------------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const mix   = lerp;
const rad   = (d) => d * Math.PI / 180;

/* ---- Easing -----------------------------------------------
   Deliberately NOT corporate. Fast out, hard settle, overshoot. */
const E = {
  linear:   t => t,
  // very fast departure, long settle — the "snap" workhorse
  expoOut:  t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  expoIn:   t => t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  quintOut: t => 1 - Math.pow(1 - t, 5),
  cubicOut: t => 1 - Math.pow(1 - t, 3),
  cubicIn:  t => t * t * t,
  // overshoot past the target then settle back — paper landing
  backOut:  (t, s = 1.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  // small secondary bounce
  bounceOut: t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
  // hold, then snap — for hard cuts on the beat
  snap: t => t < 0.62 ? 0 : E.expoOut((t - 0.62) / 0.38)
};

/* Scale punch described in the brief: 80% -> 110% -> 100% */
function punch(t, lo = 0.80, over = 1.10) {
  if (t <= 0) return lo;
  if (t >= 1) return 1;
  if (t < 0.45) return lerp(lo, over, E.expoOut(t / 0.45));
  return lerp(over, 1, E.cubicOut((t - 0.45) / 0.55));
}

/* ---- Canvas helpers --------------------------------------- */
function mk(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
/* Save/transform/draw/restore without the boilerplate. */
function layer(ctx, { x = 0, y = 0, rot = 0, sx = 1, sy = null, a = 1, ox = 0, oy = 0 }, fn) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rad(rot));
  ctx.scale(sx, sy === null ? sx : sy);
  ctx.translate(-ox, -oy);
  fn(ctx);
  ctx.restore();
}
