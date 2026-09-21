/* ============================================================
   texture.js — the "printed, not rendered" layer.
   Paper stock, grain, halftone, photocopy dirt, scan lines,
   registration offset. All seeded => identical every render.
   ============================================================ */

/* ---- Paper stock ------------------------------------------
   Built once. Warm off-white base + fibres + uneven exposure
   + the faintest designer's grid. Never pure white. */
let _paper = null;
function paperPlate() {
  if (_paper) return _paper;
  const c = mk(W, H), x = c.getContext('2d');
  const r = rng(20260921);

  x.fillStyle = C.paper;
  x.fillRect(0, 0, W, H);
  // warm wash so the stock reads as recycled off-white, never grey
  const warmG = x.createLinearGradient(0, 0, W, H);
  warmG.addColorStop(0, 'rgba(255,246,224,0.34)');
  warmG.addColorStop(1, 'rgba(246,238,218,0.20)');
  x.fillStyle = warmG;
  x.fillRect(0, 0, W, H);

  // Uneven exposure — big soft blotches, like a scanner lamp falling off
  for (let i = 0; i < 26; i++) {
    const cx = r() * W, cy = r() * H, rad0 = 260 + r() * 620;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad0);
    const warm = r() > 0.5;
    g.addColorStop(0, warm ? 'rgba(255,250,232,0.115)' : 'rgba(162,154,134,0.042)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(cx - rad0, cy - rad0, rad0 * 2, rad0 * 2);
  }

  // Designer's grid — must read as a desk, not graph paper.
  x.strokeStyle = 'rgba(17,17,17,0.030)';
  x.lineWidth = 1;
  const G = 45;
  x.beginPath();
  for (let gx = G; gx < W; gx += G) { x.moveTo(gx + 0.5, 0); x.lineTo(gx + 0.5, H); }
  for (let gy = G; gy < H; gy += G) { x.moveTo(0, gy + 0.5); x.lineTo(W, gy + 0.5); }
  x.stroke();

  // Heavier construction lines, very occasional
  x.strokeStyle = 'rgba(17,17,17,0.055)';
  x.beginPath();
  for (let gx = G * 6; gx < W; gx += G * 6) { x.moveTo(gx + 0.5, 0); x.lineTo(gx + 0.5, H); }
  for (let gy = G * 6; gy < H; gy += G * 6) { x.moveTo(0, gy + 0.5); x.lineTo(W, gy + 0.5); }
  x.stroke();

  // Paper fibres — short hairline strokes at random angles
  for (let i = 0; i < 2600; i++) {
    const fx = r() * W, fy = r() * H, len = 2 + r() * 11, ang = r() * Math.PI;
    x.strokeStyle = r() > 0.45
      ? `rgba(120,114,100,${0.030 + r() * 0.055})`
      : `rgba(255,255,255,${0.050 + r() * 0.075})`;
    x.lineWidth = r() * 1.05;
    x.beginPath();
    x.moveTo(fx, fy);
    x.lineTo(fx + Math.cos(ang) * len, fy + Math.sin(ang) * len);
    x.stroke();
  }

  // Dust + specks
  for (let i = 0; i < 620; i++) {
    const s = r() * 1.9;
    x.fillStyle = `rgba(40,38,34,${0.05 + r() * 0.16})`;
    x.fillRect(r() * W, r() * H, s, s);
  }

  _paper = c;
  return c;
}

/* ---- Animated grain ---------------------------------------
   8 pre-baked tiles cycled by frame. Cheap, deterministic,
   and it moves — static grain looks dead. */
let _grain = null;
function grainTiles() {
  if (_grain) return _grain;
  const N = 8, S = 360;
  _grain = [];
  for (let t = 0; t < N; t++) {
    const c = mk(S, S), x = c.getContext('2d');
    const img = x.createImageData(S, S);
    const r = rng(7000 + t * 131);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r();
      // sparse, punchy specks rather than uniform mush
      const on = v > 0.86;
      const lum = v > 0.93 ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = lum;
      img.data[i + 3] = on ? 26 + r() * 44 : 0;
    }
    x.putImageData(img, 0, 0);
    _grain.push(c);
  }
  return _grain;
}
function drawGrain(ctx, f, alpha = 0.5) {
  const tiles = grainTiles();
  const t = tiles[f % tiles.length];
  ctx.save();
  ctx.globalAlpha = alpha;
  // shift the tile each frame so the pattern never visibly repeats
  const ox = -(hash(f, 3) * t.width) | 0;
  const oy = -(hash(f, 4) * t.height) | 0;
  for (let y = oy; y < H; y += t.height)
    for (let x2 = ox; x2 < W; x2 += t.width) ctx.drawImage(t, x2, y);
  ctx.restore();
}

/* ---- Halftone ---------------------------------------------
   Applied to SELECTED elements only, per the brief — not the
   whole frame. Classic 45deg dot screen from luminance. */
function halftone(src, cell = 5, angle = 45, ink = '#111111') {
  const w = src.width, h = src.height;
  const s = src.getContext ? src : null;
  const tmp = mk(w, h), tx = tmp.getContext('2d');
  tx.drawImage(src, 0, 0);
  const data = tx.getImageData(0, 0, w, h).data;

  const out = mk(w, h), ox = out.getContext('2d');
  ox.fillStyle = ink;
  const a = rad(angle), ca = Math.cos(a), sa = Math.sin(a);
  const diag = Math.ceil(Math.sqrt(w * w + h * h));

  for (let v = -diag; v < diag; v += cell) {
    for (let u = -diag; u < diag; u += cell) {
      // rotated sample point
      const px = u * ca - v * sa + w / 2;
      const py = u * sa + v * ca + h / 2;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const i = ((py | 0) * w + (px | 0)) * 4;
      if (data[i + 3] < 12) continue;
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      const rad0 = (1 - lum) * cell * 0.78;
      if (rad0 < 0.28) continue;
      ox.beginPath();
      ox.arc(px, py, rad0, 0, Math.PI * 2);
      ox.fill();
    }
  }
  return out;
}

/* ---- Photocopy ---------------------------------------------
   Crushes midtones, blows highlights, adds toner speckle. */
function photocopy(src, amount = 1) {
  const w = src.width, h = src.height;
  const c = mk(w, h), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  const r = rng(4242);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    let lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    // hard S-curve
    lum = lum < 118 ? lum * 0.55 : 90 + (lum - 118) * 1.72;
    lum += (r() - 0.5) * 34 * amount;          // toner noise
    lum = clamp(lum, 0, 255);
    const k = 1 - amount;
    d[i]     = d[i]     * k + lum * amount;
    d[i + 1] = d[i + 1] * k + lum * amount;
    d[i + 2] = d[i + 2] * k + lum * amount;
  }
  x.putImageData(img, 0, 0);
  return c;
}

/* ---- Scan lines -------------------------------------------
   Occasional, extremely subtle horizontal scanner slip. */
function scanlines(ctx, f) {
  // only fires now and then, and only briefly
  const gate = hash(Math.floor(f / 19), 91);
  if (gate > 0.30) return;
  const band = Math.floor(hash(Math.floor(f / 19), 92) * H);
  const hgt = 26 + hash(f, 93) * 80;
  ctx.save();
  ctx.globalAlpha = 0.05 + hash(f, 94) * 0.055;
  ctx.fillStyle = C.ink;
  for (let y = band; y < band + hgt; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.restore();
}

/* ---- Registration offset -----------------------------------
   Misprint: pull the red plate 1-3px off the black plate.
   Draw the same content twice through this helper. */
function misregister(f, seed = 1) {
  const s = 1 + hash(Math.floor(f / 7), seed) * 2;   // 1-3 px
  const a = hash(Math.floor(f / 7), seed + 1) * Math.PI * 2;
  return { dx: Math.cos(a) * s, dy: Math.sin(a) * s };
}

/* ---- Vignette / print edge --------------------------------- */
function printEdge(ctx) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(30,26,20,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
