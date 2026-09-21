/* ============================================================
   photo.js — photographs treated as physical cutouts.
   Rough edges, sticker borders, paper shadow, slight rotation,
   optional halftone, and a marker outline that is NOT a clean
   vector stroke.
   ============================================================ */

const IMG = {};        // name -> HTMLImageElement (or null if missing)
let _imgReady = false;

function loadImages(names) {
  return Promise.all(names.map(n => new Promise(res => {
    const im = new Image();
    im.onload  = () => { IMG[n] = im; res(); };
    im.onerror = () => { IMG[n] = null; res(); };   // missing is fine
    im.src = `assets/img/${n}`;
  }))).then(() => { _imgReady = true; });
}

/* ---- Placeholder -------------------------------------------
   Used when an asset hasn't landed yet. Deliberately obvious
   (diagonal rule + label) so nobody mistakes it for final art. */
function placeholder(w, h, label, seed = 1) {
  const c = mk(w, h), x = c.getContext('2d');
  x.fillStyle = C.grey; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(17,17,17,0.30)'; x.lineWidth = 2;
  x.strokeRect(1, 1, w - 2, h - 2);
  x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke();
  x.fillStyle = 'rgba(17,17,17,0.62)';
  x.font = `600 ${Math.max(13, w * 0.055)}px "Inter", Arial, sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(label || 'IMAGE', w / 2, h / 2);
  return c;
}

/* Get a drawable source for a content image index. */
function src(i, w, h) {
  const name = CONTENT.images[i % CONTENT.images.length];
  const im = IMG[name];
  if (im) return im;
  return placeholder(w, h, `CASE ${String(i + 1).padStart(2, '0')}`, i);
}

/* ---- Rough-edge mask ----------------------------------------
   Irregular torn/cut boundary — never a clean rectangle. */
function roughRectPath(ctx, w, h, amp = 5, seed = 3, step = 16) {
  ctx.beginPath();
  const edge = (from, to, fixed, horiz, s) => {
    const d = to > from ? step : -step;
    for (let v = from; d > 0 ? v <= to : v >= to; v += d) {
      const n = (noise1(v / 38, s) - 0.5) * amp * 2;
      horiz ? ctx.lineTo(v, fixed + n) : ctx.lineTo(fixed + n, v);
    }
  };
  ctx.moveTo(0, 0);
  edge(0, w, 0, true, seed);
  edge(0, h, w, false, seed + 11);
  edge(w, 0, h, true, seed + 22);
  edge(h, 0, 0, false, seed + 33);
  ctx.closePath();
}

/* ---- The cutout ---------------------------------------------
   opts:
     rot        slight rotation, degrees
     sticker    white photo border (px) — the "printed photo" look
     outline    draw the red marker outline
     grow       0..1 for the outline being drawn on
     halftone   apply dot screen
     tapeIt     stick it down with tape
     shadow     paper shadow
*/
function cutout(ctx, source, cx, cy, w, h, opts = {}) {
  const seed = opts.seed || 7;
  const rot  = opts.rot || 0;
  const stick = opts.sticker === undefined ? 0 : opts.sticker;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad(rot));
  ctx.scale(opts.scale === undefined ? 1 : opts.scale, opts.scale === undefined ? 1 : opts.scale);
  ctx.globalAlpha *= (opts.alpha === undefined ? 1 : opts.alpha);

  const fw = w + stick * 2, fh = h + stick * 2;

  // paper shadow — subtle, physical, offset down-right
  if (opts.shadow !== false) {
    ctx.save();
    ctx.shadowColor = 'rgba(24,20,16,0.34)';
    ctx.shadowBlur = opts.shadowBlur || 20;
    ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 9;
    ctx.fillStyle = C.white;
    ctx.translate(-fw / 2, -fh / 2);
    roughRectPath(ctx, fw, fh, 3.4, seed);
    ctx.fill();
    ctx.restore();
  }

  // white sticker border
  if (stick > 0) {
    ctx.save();
    ctx.translate(-fw / 2, -fh / 2);
    ctx.fillStyle = C.white;
    roughRectPath(ctx, fw, fh, 3.4, seed);
    ctx.fill();
    ctx.restore();
  }

  // the image itself, clipped to a rough edge
  ctx.save();
  ctx.translate(-w / 2, -h / 2);
  roughRectPath(ctx, w, h, opts.edgeAmp === undefined ? 4.6 : opts.edgeAmp, seed + 5);
  ctx.clip();

  let drawSrc = source;
  if (opts.halftone) {
    const tmp = mk(w, h), tc = tmp.getContext('2d');
    tc.drawImage(source, 0, 0, w, h);
    drawSrc = halftone(tmp, opts.halftoneCell || 5, 45);
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, w, h);
  } else if (opts.copy) {
    const tmp = mk(w, h), tc = tmp.getContext('2d');
    tc.drawImage(source, 0, 0, w, h);
    drawSrc = photocopy(tmp, opts.copy);
  }
  ctx.drawImage(drawSrc, 0, 0, w, h);

  // print grade on the photo: knock back saturation, lift blacks slightly
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(233,231,224,0.14)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // marker outline, drawn around the cutout
  if (opts.outline) {
    ctx.save();
    ctx.translate(-fw / 2, -fh / 2);
    outlineBox(ctx, 0, 0, fw, fh, {
      seed: seed + 3,
      pad: opts.outlinePad === undefined ? 9 : opts.outlinePad,
      width: opts.outlineWidth || 6,
      grow: opts.grow === undefined ? 1 : opts.grow,
      color: opts.outlineColor || C.red
    });
    ctx.restore();
  }

  if (opts.tapeIt) {
    tape(ctx, -fw / 2 + 12, -fh / 2 + 6, 120, 40, -28, { seed: seed + 8 });
    tape(ctx,  fw / 2 - 12,  fh / 2 - 6, 120, 40, -24, { seed: seed + 9 });
  }

  ctx.restore();

  if (opts.crop) cropMarks(ctx, cx - fw / 2, cy - fh / 2, fw, fh, { alpha: 0.45 });
}
