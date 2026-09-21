/* ============================================================
   timeline.js — the edit.
   21s @ 24fps = 504 frames. 120 BPM => 12 frames per beat.
   Every major hit lands on a beat boundary.

     S1 OPEN   f0   - f48    beats  0-4    PORTFOLIO
     S2 INTRO  f48  - f120   beats  4-10   hero cutout + THIS IS THE WORK
     S3 CHAOS  f120 - f216   beats 10-18   oversized type + torn strip
     S4 CASES  f216 - f312   beats 18-26   stacked prints
     S5 PUNCH  f312 - f408   beats 26-34   CREATE / MAKE / MOVE
     S6 CALM   f408 - f480   beats 34-40   MAKE IT MEAN SOMETHING
     S7 END    f480 - f504   beats 40-42   LET'S MAKE SOMETHING GOOD
   ============================================================ */

const S = { OPEN:0, INTRO:48, CHAOS:120, CASES:216, PUNCH:312, CALM:408, END:480 };

/* ---- Camera -------------------------------------------------
   Not cinematic. A camera hovering over a big editorial board:
   slow push, handheld micro-drift, occasional snap zoom. */
function camera(ctx, f) {
  const push = 1 + 0.038 * (f / TOTAL);                 // slow 3.8% push-in
  // snap zooms on specific beats
  let snap = 0;
  [S.CHAOS, S.PUNCH, S.PUNCH + 32, S.PUNCH + 64, S.END].forEach((b, i) => {
    const t = span(f, b, b + 6);
    if (f >= b && f < b + 6) snap = (1 - E.expoOut(t)) * (i === 4 ? 0.055 : 0.035);
  });
  const sc = push + snap;
  const dx = (noise1(f / 26, 61) - 0.5) * 13 + (noise1(f / 7, 63) - 0.5) * 2.6;
  const dy = (noise1(f / 29, 62) - 0.5) * 13 + (noise1(f / 8, 64) - 0.5) * 2.6;
  const rt = (noise1(f / 41, 65) - 0.5) * 0.5;
  ctx.translate(W / 2 + dx, H / 2 + dy);
  ctx.rotate(rad(rt));
  ctx.scale(sc, sc);
  ctx.translate(-W / 2, -H / 2);
}

/* ---- Persistent board annotations ---------------------------
   Live across the whole piece so it reads as ONE poster that
   keeps moving, not seven separate scenes. */
function boardMarks(ctx, f) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  cropMarks(ctx, 54, 86, W - 108, H - 172, { len: 26, gap: 12, alpha: 0.4 });
  regTarget(ctx, W - 74, 128, 11, { alpha: 0.35 });
  regTarget(ctx, 74, H - 132, 11, { alpha: 0.28 });
  ctx.restore();

  // tiny running frame counter, like a contact sheet
  meta(ctx, String(f).padStart(4, '0'), W - 62, H - 66, { size: 15, align: 'right', alpha: 0.4, track: 2 });
  meta(ctx, CONTENT.role, 62, H - 66, { size: 15, alpha: 0.45, track: 3.2 });

  // rotating microcopy, changes every 2 beats
  const idx = Math.floor(f / beat(2)) % CONTENT.micro.length;
  const mAlpha = 0.34 + 0.12 * Math.sin(f / 9);
  meta(ctx, CONTENT.micro[idx], W / 2, 118, { size: 15, align: 'center', alpha: mAlpha, track: 3.4 });
}

/* ============================================================
   S1 — OPEN (0-48). Starts immediately. No logo, no intro.
   ============================================================ */
function sceneOpen(ctx, f) {
  const t = span(f, 0, beat(1.6));
  // headline slides in from the right with overshoot, bleeding off-frame
  const x = lerp(W + 240, -46, E.backOut(t, 1.35));
  const size = 232;
  headline(ctx, CONTENT.open.headline, x, 980, {
    size, track: -size * 0.052, color: C.ink, shadow: { dx: 6, dy: 7 }
  });

  // red mis-registered ghost of the same word, 2-3px off
  const mr = misregister(f, 2);
  ctx.save(); ctx.globalAlpha = 0.34;
  headline(ctx, CONTENT.open.headline, x + mr.dx * 2.2, 980 + mr.dy, {
    size, track: -size * 0.052, color: C.red, stroke: true, strokeWidth: 2
  });
  ctx.restore();

  meta(ctx, CONTENT.open.above, -46 + 8, 980 - size * 0.86, {
    size: 23, track: 5.5, reveal: span(f, beat(1), beat(2))
  });
  meta(ctx, CONTENT.open.below, -46 + 8, 1062, {
    size: 20, track: 4.4, alpha: 0.72, reveal: span(f, beat(1.4), beat(2.4))
  });

  // year marker, top right
  meta(ctx, CONTENT.year, W - 66, 186, {
    size: 30, align: 'right', track: 3, reveal: span(f, beat(0.6), beat(1.4))
  });

  // red underline drawn on beat 2
  underline(ctx, -20, 1016, 840, {
    seed: 4, grow: span(f, beat(2), beat(3)), width: 11
  });

  // --- density: this frame was too much bare paper ---
  meta(ctx, '01', 66, 320, { size: 64, track: 0, alpha: 0.13 });
  meta(ctx, 'VOL. 01', W - 66, 232, { size: 16, align: 'right', track: 3.6, alpha: 0.5,
    reveal: span(f, beat(1.2), beat(2)) });

  // thin rules bracketing the headline
  ctx.save();
  ctx.globalAlpha = 0.28 * E.expoOut(span(f, beat(1), beat(2)));
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(62, 812); ctx.lineTo(W - 62, 812); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(62, 1108); ctx.lineTo(W - 62, 1108); ctx.stroke();
  ctx.restore();

  // stacked metadata column, bottom left
  ['COPY', 'CONTENT', 'CREATIVE', 'STRATEGY'].forEach((m, i) => {
    meta(ctx, m, 66, 1320 + i * 34, { size: 18, track: 3.2, alpha: 0.6,
      reveal: span(f, beat(1.6 + i * 0.3), beat(2.2 + i * 0.3)) });
  });

  // a couple of marks so the page feels worked-on
  star(ctx, W - 130, 1340, 16, { color: C.red, alpha: E.expoOut(span(f, beat(2.4), beat(3))) });
  sparkle(ctx, W - 190, 1410, 11, { color: C.ink, alpha: 0.5 * E.expoOut(span(f, beat(2.8), beat(3.4))) });
  regTarget(ctx, 140, 1560, 14, { alpha: 0.3 });
}

/* ============================================================
   S2 — INTRO (48-120). First subject as a cutout.
   ============================================================ */
function sceneIntro(ctx, f) {
  const l = f - S.INTRO;

  // headline still present but pushed up and smaller — continuity
  const rise = E.expoOut(span(f, S.INTRO, S.INTRO + beat(1.5)));
  const hs = lerp(232, 120, rise);
  headline(ctx, CONTENT.open.headline, lerp(-46, -30, rise), lerp(980, 372, rise), {
    size: hs, track: -hs * 0.052, color: C.ink
  });

  // hero cutout pops in with a small overshoot, on the beat
  const pop = span(l, 0, beat(1));
  if (pop > 0) {
    const sc = punch(pop, 0.78, 1.07);
    const cw = 620, ch = 775;
    cutout(ctx, src(0, cw, ch), W * 0.53, 1075, cw, ch, {
      rot: -3.2, seed: 21, scale: sc, sticker: 0,
      outline: true, grow: span(l, beat(1), beat(2.2)),
      outlineWidth: 7, outlinePad: 13, crop: l > beat(2.4)
    });
  }

  // THIS IS THE WORK. — slides in from the left, crops off-frame
  const hx = lerp(-W, -38, E.expoOut(span(l, beat(1.6), beat(3.2))));
  headline(ctx, CONTENT.intro.headline, hx, 1640, {
    size: 116, track: -4, color: C.ink
  });

  // metadata stack, staggered one per half-beat
  CONTENT.intro.metas.forEach((m, i) => {
    meta(ctx, m, 62, 1720 + i * 36, {
      size: 20, track: 3.4, alpha: 0.8,
      reveal: span(l, beat(2.4 + i * 0.5), beat(3.2 + i * 0.5))
    });
  });

  // handwritten note + arrow pointing at the cutout
  const d = span(l, beat(3.4), beat(4.4));
  hand(ctx, CONTENT.notes[0], 128, 830, { size: 54, rot: -9, draw: d, color: C.red });
  arrow(ctx, 300, 846, 470, 905, { seed: 9, grow: span(l, beat(4), beat(5)), bow: 22 });
}

/* ============================================================
   S3 — CHAOS (120-216). Oversized moving type + torn strip.
   ============================================================ */
function sceneChaos(ctx, f) {
  const l = f - S.CHAOS;

  // hero cutout persists, drifting left
  const drift = E.cubicOut(span(l, 0, beat(4)));
  cutout(ctx, src(0, 620, 775), lerp(W * 0.53, W * 0.34, drift), lerp(1075, 1010, drift), 620, 775, {
    rot: lerp(-3.2, -5.4, drift), seed: 21, outline: true, grow: 1,
    outlineWidth: 7, outlinePad: 13, halftone: l > beat(5), halftoneCell: 5
  });

  // second cutout snaps in on beat 13
  const p2 = span(l, beat(3), beat(4));
  if (p2 > 0) {
    cutout(ctx, src(1, 430, 540), W * 0.78, 1500, 430, 540, {
      rot: 5.6, seed: 33, scale: punch(p2, 0.82, 1.08),
      sticker: 16, shadow: true, tapeIt: p2 > 0.9
    });
  }

  // black torn strip slides across under the subject
  const sy = lerp(H + 60, 700, E.expoOut(span(l, beat(1), beat(2.6))));
  if (sy < H) {
    tornStrip(ctx, -30, sy, W + 60, 124, { seed: 17, amp: 9 });
    stripType(ctx, CONTENT.chaos.strip, sy + 8, 108, f, { size: 62, speed: -3.6, track: 2 });
  }

  // stars popping on beats
  [[170, 640, 5], [W - 150, 900, 7], [250, 1780, 4], [W - 210, 1660, 6]].forEach((s, i) => {
    const t = span(l, beat(4 + i * 0.5), beat(4.4 + i * 0.5));
    if (t > 0) star(ctx, s[0], s[1], s[2] * 4.4 * punch(t, 0.2, 1.25), {
      color: i % 2 ? C.red : C.ink, rot: i * 18, seed: i
    });
  });

  meta(ctx, 'BRAND / SOCIAL', 62, 1846, { size: 19, track: 3.6, alpha: 0.7 });
}

/* ============================================================
   S4 — CASES (216-312). Printed photographs, stacked.
   ============================================================ */
function sceneCases(ctx, f) {
  const l = f - S.CASES;

  // headline enters first, top of frame
  headline(ctx, "GOOD IDEAS", -34, 470, {
    size: 132, track: -5, reveal: span(l, 0, beat(1.2))
  });
  headline(ctx, "DON'T SIT STILL.", -34, 596, {
    size: 132, track: -5, reveal: span(l, beat(0.8), beat(2.2))
  });

  // supporting line, revealed in chunks not all at once
  const chunk = span(l, beat(2), beat(5)) * 3;
  copy(ctx, CONTENT.cases.sub, 62, 672, W - 190, { size: 28, chunk, alpha: 0.85 });

  // stack of prints, each snapping in on its own beat
  const stack = [
    { i: 2, x: W * 0.36, y: 1180, w: 470, h: 590, rot: -6.5, b: 2.5 },
    { i: 3, x: W * 0.62, y: 1300, w: 450, h: 562, rot:  4.8, b: 3.5 },
    { i: 4, x: W * 0.46, y: 1470, w: 430, h: 538, rot: -2.2, b: 4.5 }
  ];
  stack.forEach((s, k) => {
    const t = span(l, beat(s.b), beat(s.b + 1));
    if (t <= 0) return;
    cutout(ctx, src(s.i, s.w, s.h), s.x, s.y, s.w, s.h, {
      rot: s.rot, seed: 40 + k * 7, scale: punch(t, 0.84, 1.06),
      sticker: 18, shadow: true, tapeIt: t > 0.85, crop: false
    });
    meta(ctx, CONTENT.cases.labels[k], s.x - s.w / 2 + 6, s.y + s.h / 2 + 46, {
      size: 17, track: 3, alpha: 0.75 * t
    });
  });

  // red annotation ring on the strongest one
  circleMark(ctx, W * 0.62, 1300, 258, 312, {
    seed: 12, grow: span(l, beat(6), beat(7.4)), width: 6
  });
  hand(ctx, CONTENT.notes[1], W * 0.62 + 250, 1006, {
    size: 50, rot: -6, draw: span(l, beat(7), beat(8)), color: C.red
  });

  // --- density ---
  meta(ctx, 'SELECTED WORK / 2026', W - 62, 800, { size: 17, align: 'right', track: 3.4, alpha: 0.55 });
  ['★', '✦'].forEach((sym, i) => {
    const t = span(l, beat(5.5 + i), beat(6 + i));
    if (t > 0) star(ctx, 120 + i * 60, 1880 - i * 40, 13 * punch(t, 0.3, 1.2),
      { color: i ? C.ink : C.red, points: i ? 4 : 5, inner: i ? 0.22 : 0.42 });
  });
}

/* ============================================================
   S5 — PUNCH (312-408). Three hard snaps, 32 frames each.
   ============================================================ */
function scenePunch(ctx, f) {
  const l = f - S.PUNCH;
  const slot = Math.min(2, Math.floor(l / 32));
  const lt = (l - slot * 32) / 32;

  // background type keeps moving so it never feels like a cut
  bgType(ctx, CONTENT.chaos.bgWord, 760, f, {
    size: 470, speed: -3.4, color: 'rgba(17,17,17,0.10)'
  });

  const word = CONTENT.punch[slot];
  const sc = punch(clamp(lt / 0.42, 0, 1), 0.62, 1.12);
  const size = 250 * sc;

  // previous word lingers a frame or two behind, overlapping
  if (slot > 0 && lt < 0.16) {
    ctx.save(); ctx.globalAlpha = 0.28 * (1 - lt / 0.16);
    headline(ctx, CONTENT.punch[slot - 1], W / 2, 1080, {
      size: 250, track: -13, align: 'center', color: C.ink
    });
    ctx.restore();
  }

  // red plate, offset
  const mr = misregister(f, 5);
  headline(ctx, word, W / 2 + mr.dx * 2.4, 1080 + mr.dy * 2.4, {
    size, track: -size * 0.052, align: 'center', color: C.red
  });
  headline(ctx, word, W / 2, 1080, {
    size, track: -size * 0.052, align: 'center', color: C.ink
  });

  // marker slash through the word on the second half of each slot
  if (lt > 0.45) {
    const g = span(lt, 0.45, 0.8);
    marker(ctx, [[W * 0.18, 1145], [W * 0.5, 1120], [W * 0.84, 1152]],
      { seed: 60 + slot, width: 10, amp: 5, grow: g });
  }

  // punctuation symbols
  const syms = ['★', '✦', '→', '+', '×'];
  syms.forEach((s, i) => {
    const t = span(l, beat(i * 0.6), beat(i * 0.6 + 0.4));
    if (t <= 0) return;
    ctx.save();
    setType(ctx, { font: F.display, size: 54 + i * 7, track: 0 });
    ctx.fillStyle = i % 2 ? C.red : C.ink;
    ctx.globalAlpha = 0.9 * t;
    ctx.textAlign = 'center';
    const px = 150 + (i * 197) % (W - 240);
    const py = 640 + ((i * 431) % 1000);
    ctx.translate(px, py); ctx.rotate(rad(jit(i, 7) * 22));
    ctx.fillText(s, 0, 0);
    ctx.restore();
  });
}

/* ============================================================
   S6 — CALM (408-480). Back down. Strongest image.
   ============================================================ */
function sceneCalm(ctx, f) {
  const l = f - S.CALM;
  const dr = E.cubicOut(span(l, 0, beat(6))) * 26;   // gentle horizontal drift

  const t = span(l, 0, beat(1.4));
  cutout(ctx, src(5, 700, 875), W * 0.5 - dr, 1140, 700, 875, {
    rot: 2.1, seed: 55, scale: punch(t, 0.9, 1.03),
    sticker: 20, shadow: true, outline: l > beat(2),
    grow: span(l, beat(2), beat(3.4)), outlineWidth: 6, outlinePad: 16
  });

  headline(ctx, 'MAKE IT MEAN', -30 + dr * 0.4, 440, {
    size: 126, track: -5, reveal: span(l, beat(0.6), beat(2))
  });
  headline(ctx, 'SOMETHING.', -30 + dr * 0.4, 566, {
    size: 126, track: -5, reveal: span(l, beat(1.4), beat(2.8))
  });

  CONTENT.calm.sub.split('\n').forEach((ln, i) => {
    meta(ctx, ln, 62, 1700 + i * 40, {
      size: 26, track: 0.6, caps: false, weight: '400', alpha: 0.88,
      reveal: span(l, beat(3 + i * 0.7), beat(4 + i * 0.7))
    });
  });

  meta(ctx, 'IDEA → EXECUTION', W - 62, 1846, { size: 18, align: 'right', track: 3.4, alpha: 0.65 });
}

/* ============================================================
   S7 — END (480-504). Locks on the beat. No fade to black.
   ============================================================ */
function sceneEnd(ctx, f) {
  const l = f - S.END;

  const t = E.expoOut(span(l, 0, beat(0.8)));
  const y = lerp(1000, 900, t);

  const fs = 130;
  headline(ctx, "LET'S MAKE", 58, y, { size: fs, track: -fs * 0.045, reveal: span(l, 0, beat(0.7)) });
  headline(ctx, 'SOMETHING', 58, y + fs, { size: fs, track: -fs * 0.045, reveal: span(l, beat(0.4), beat(1.1)) });
  headline(ctx, 'GOOD.', 58, y + fs * 2, { size: fs, track: -fs * 0.045, reveal: span(l, beat(0.8), beat(1.5)) });

  // final red underline — the last thing that moves
  underline(ctx, 54, y + fs * 2 + 34, 470, { seed: 8, grow: span(l, beat(1.2), beat(2)), width: 13 });

  meta(ctx, CONTENT.end.sub, 60, y + fs * 2 + 116, {
    size: 22, track: 4.2, reveal: span(l, beat(1.6), beat(2.2))
  });
  meta(ctx, CONTENT.name, 60, y + fs * 2 + 164, {
    size: 26, track: 3, alpha: 0.9, reveal: span(l, beat(1.8), beat(2.4))
  });
}

/* ============================================================
   MASTER
   ============================================================ */
function renderFrame(ctx, f) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // paper is drawn OUTSIDE the camera transform so edges never show
  ctx.drawImage(paperPlate(), 0, 0);

  ctx.save();
  camera(ctx, f);

  // continuous background type — runs the whole piece, ties it together.
  // Word changes per section but the motion never stops, so the video
  // reads as one moving poster rather than seven separate scenes.
  const bgWord = f < S.INTRO ? 'STRATEGY'
               : f < S.CHAOS ? 'IDEAS'
               : f < S.CASES ? CONTENT.chaos.bgWord
               : f < S.PUNCH ? 'SELECTED'
               : f < S.CALM  ? 'CREATIVE'
               : f < S.END   ? 'WORDS'
               :               'GOOD';
  const bgY = f < S.INTRO ? 1420 : f < S.CHAOS ? 1500 : f < S.CASES ? 900 : f < S.PUNCH ? 1640 : f < S.CALM ? 760 : 1560;
  bgType(ctx, bgWord, bgY, f, {
    size: 430, speed: -2.4, color: 'rgba(17,17,17,0.075)'
  });

  boardMarks(ctx, f);

  if      (f < S.INTRO) sceneOpen(ctx, f);
  else if (f < S.CHAOS) sceneIntro(ctx, f);
  else if (f < S.CASES) sceneChaos(ctx, f);
  else if (f < S.PUNCH) sceneCases(ctx, f);
  else if (f < S.CALM)  scenePunch(ctx, f);
  else if (f < S.END)   sceneCalm(ctx, f);
  else                  sceneEnd(ctx, f);

  ctx.restore();

  // print finishing, applied flat over the whole frame
  scanlines(ctx, f);
  drawGrain(ctx, f, 0.46);
  printEdge(ctx);
}
