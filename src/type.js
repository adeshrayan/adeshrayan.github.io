/* ============================================================
   type.js — typography as a graphic element, not a caption.
   Headlines are meant to be too big, tightly tracked, and to
   run off the edge of the frame.
   ============================================================ */

const F = {
  display: '"Anton", "Haettenschweiler", Impact, sans-serif',
  heavy:   '"Archivo Black", "Helvetica Neue", Arial, sans-serif',
  meta:    '"Inter", "Helvetica Neue", Arial, sans-serif',
  hand:    '"Caveat", "Bradley Hand", cursive'
};

/* Set font + tracking in one go. Chrome supports ctx.letterSpacing. */
function setType(ctx, { font = F.display, size = 100, weight = '', track = 0 } = {}) {
  ctx.font = `${weight} ${size}px ${font}`.trim();
  ctx.letterSpacing = `${track}px`;
}

/* Measured width honouring tracking. */
function tw(ctx, text, opts) { setType(ctx, opts); return ctx.measureText(text).width; }

/* ---- Headline ----------------------------------------------
   Big. All caps. Tight. Allowed to bleed off-frame.
   `reveal` 0..1 wipes it in from the left through a hard mask. */
function headline(ctx, text, x, y, opts = {}) {
  const size  = opts.size || 190;
  const track = opts.track === undefined ? -size * 0.035 : opts.track;
  const font  = opts.font || F.display;
  const color = opts.color || C.ink;
  const align = opts.align || 'left';

  ctx.save();
  setType(ctx, { font, size, track });
  ctx.textAlign = align;
  ctx.textBaseline = opts.baseline || 'alphabetic';

  const w = ctx.measureText(text).width;

  if (opts.reveal !== undefined && opts.reveal < 1) {
    const r = clamp(opts.reveal, 0, 1);
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.beginPath();
    ctx.rect(x0 - 24, y - size * 1.15, (w + 48) * r, size * 1.55);
    ctx.clip();
  }

  if (opts.shadow) {
    ctx.save();
    ctx.globalAlpha *= 0.22;
    ctx.fillStyle = C.ink;
    ctx.fillText(text, x + (opts.shadow.dx || 5), y + (opts.shadow.dy || 5));
    ctx.restore();
  }

  if (opts.stroke) {
    ctx.lineWidth = opts.strokeWidth || 3;
    ctx.strokeStyle = color;
    ctx.strokeText(text, x, y);
  } else {
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
  ctx.restore();
  return w;
}

/* ---- Oversized background type ------------------------------
   Deliberately larger than the frame, scrolling horizontally
   behind everything. Pure graphic texture. */
function bgType(ctx, text, y, f, opts = {}) {
  const size  = opts.size || 430;
  const speed = opts.speed === undefined ? -2.6 : opts.speed;  // px per frame
  const color = opts.color || 'rgba(17,17,17,0.085)';
  const track = opts.track === undefined ? -size * 0.045 : opts.track;
  const gap   = opts.gap || 90;

  ctx.save();
  setType(ctx, { font: opts.font || F.display, size, track });
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;

  const unit = ctx.measureText(text).width + gap;
  let x = ((f * speed) % unit);
  if (x > 0) x -= unit;
  for (; x < W + unit; x += unit) ctx.fillText(text, x, y);
  ctx.restore();
}

/* ---- Editorial metadata ------------------------------------
   Small, tracked-out, uppercase. Looks like annotation on a
   printed board rather than marketing copy. */
function meta(ctx, text, x, y, opts = {}) {
  const size = opts.size || 21;
  ctx.save();
  setType(ctx, { font: opts.font || F.meta, size, weight: opts.weight || '600', track: opts.track === undefined ? 2.6 : opts.track });
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.baseline || 'alphabetic';
  ctx.fillStyle = opts.color || C.ink;
  ctx.globalAlpha *= (opts.alpha === undefined ? 1 : opts.alpha);
  if (opts.reveal !== undefined && opts.reveal < 1) {
    const w = ctx.measureText(text).width;
    const x0 = opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x;
    ctx.beginPath();
    ctx.rect(x0 - 6, y - size * 1.4, (w + 12) * clamp(opts.reveal, 0, 1), size * 2);
    ctx.clip();
  }
  ctx.fillText(text.toUpperCase ? (opts.caps === false ? text : text.toUpperCase()) : text, x, y);
  ctx.restore();
}

/* ---- Body / supporting copy (sentence case, wraps) ---------- */
function copy(ctx, text, x, y, maxW, opts = {}) {
  const size = opts.size || 27;
  const lh = opts.lh || size * 1.42;
  ctx.save();
  setType(ctx, { font: F.meta, size, weight: opts.weight || '400', track: opts.track || 0 });
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = opts.color || C.ink;
  ctx.globalAlpha *= (opts.alpha === undefined ? 1 : opts.alpha);

  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const wd of words) {
    const t = cur ? cur + ' ' + wd : wd;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; }
    else cur = t;
  }
  if (cur) lines.push(cur);

  // reveal in word-chunks, per the brief — not all at once
  const shown = opts.chunk === undefined ? lines.length : opts.chunk;
  lines.forEach((ln, i) => {
    if (i >= shown) return;
    const fade = clamp(shown - i, 0, 1);
    ctx.save();
    ctx.globalAlpha *= fade;
    ctx.fillText(ln, x, y + i * lh + (1 - fade) * 9);
    ctx.restore();
  });
  ctx.restore();
  return lines.length * lh;
}

/* ---- Handwritten annotation ---------------------------------
   Sparing use only. `draw` 0..1 wipes it on as if being written. */
function hand(ctx, text, x, y, opts = {}) {
  const size = opts.size || 46;
  ctx.save();
  setType(ctx, { font: F.hand, size, weight: '600', track: 0 });
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = opts.color || C.red;
  ctx.globalAlpha *= (opts.alpha === undefined ? 1 : opts.alpha);
  if (opts.rot) { ctx.translate(x, y); ctx.rotate(rad(opts.rot)); x = 0; y = 0; }
  if (opts.draw !== undefined && opts.draw < 1) {
    const w = ctx.measureText(text).width;
    const x0 = opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x;
    ctx.beginPath();
    ctx.rect(x0 - 4, y - size * 1.3, (w + 10) * clamp(opts.draw, 0, 1), size * 1.9);
    ctx.clip();
  }
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ---- Type on a torn strip -----------------------------------
   White type riding a moving black strip. */
function stripType(ctx, text, stripY, h, f, opts = {}) {
  const size = opts.size || h * 0.56;
  const speed = opts.speed === undefined ? -3.4 : opts.speed;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, stripY - 4, W, h + 8);
  ctx.clip();
  setType(ctx, { font: opts.font || F.display, size, track: opts.track || 1.5 });
  ctx.textBaseline = 'middle';
  ctx.fillStyle = opts.color || C.white;
  const unit = ctx.measureText(text).width + (opts.gap || 60);
  let x = ((f * speed) % unit);
  if (x > 0) x -= unit;
  for (; x < W + unit; x += unit) ctx.fillText(text, x, stripY + h / 2);
  ctx.restore();
}
