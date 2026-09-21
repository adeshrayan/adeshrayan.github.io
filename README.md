# Adesh Rayan — Creative Strategist

Portfolio site + the 9:16 vertical reel it features, both built in the same
editorial / brutalist language.

- **`index.html`** — the site. Static, no build step, deploys to GitHub Pages as-is.
- **`render.html` + `src/`** — the reel: a deterministic canvas composition
  rendered frame-by-frame to MP4.

```
1080 × 1920   ·   24 fps   ·   21 s   ·   504 frames   ·   120 BPM grid
```

No After Effects, no framework, no build step. Plain JavaScript on a canvas,
driven by headless Chrome and encoded with ffmpeg.

---

## Why it's built this way

Every frame is a **pure function of its frame index**. There is no wall clock
and no `Math.random()` at draw time — all "imperfection" (paper fibres, marker
wobble, handheld jitter, misregistration) comes from a seeded PRNG keyed on the
frame number.

That means:

- the same frame always renders identically,
- a render can be resumed or re-run in pieces,
- and beat sync is exact rather than approximate.

The edit sits on a **120 BPM grid = 12 frames per beat**, so every major hit
lands on a beat boundary. A 120 BPM track will sync without nudging.

---

## Deploying the site

Push to GitHub, then **Settings → Pages → Source: `main` / root**.
It serves as-is — no build step, no Actions, no dependencies.

Everything the page needs (fonts, video, poster, imagery) is committed and
referenced by relative path, so it works equally from `file://`, a local
server, or Pages.

---

## Layout

```
index.html           the portfolio site
render.html          the composition + a scrub/preview player
src/
  core.js            timing, seeded RNG, easing, the beat grid
  texture.js         paper stock, grain, halftone, photocopy, scan lines
  marks.js           marker strokes, torn paper, tape, crop marks, stars
  type.js            headline / metadata / handwriting systems
  photo.js           cutout treatment — rough edges, sticker borders, shadow
  content.js         ALL copy and asset references  ← edit this one
  timeline.js        the 21-second edit
tools/
  capture.py         drives headless Chrome over CDP, writes frames/f*.png
  build.sh           frames → MP4 / ProRes / GIF
  fetch_ig.md        how to pull the Instagram assets
assets/
  fonts/             Anton, Archivo Black, Inter, Caveat (vendored locally)
  img/               source imagery
  portfolio.mp4      the reel, web-encoded (what the site plays)
  poster.jpg         video poster frame
```

**To change the words or the work, you only touch `src/content.js`.**
Timing lives in `timeline.js`; nothing person-specific is hard-coded elsewhere.

---

## Running it

Preview in a browser, with a scrubber:

```sh
python3 -m http.server 8080
open http://127.0.0.1:8080/render.html
```

Render and encode:

```sh
python3 -m venv .venv && ./.venv/bin/pip install websocket-client
python3 -m http.server 8080 &            # must be running during capture
./.venv/bin/python tools/capture.py      # 504 frames → frames/
tools/build.sh                           # → out/portfolio_1080x1920_24fps.mp4
```

Render a slice while iterating:

```sh
./.venv/bin/python tools/capture.py 120 216      # one section
./.venv/bin/python tools/capture.py 19,60,250    # specific frames
```

---

## The edit

| Frames | Beats | Section | Content |
|--------|-------|---------|---------|
| 0–48 | 0–4 | OPEN | `PORTFOLIO` — slide in, overshoot, red underline |
| 48–120 | 4–10 | INTRO | hero cutout + marker outline, `THIS IS THE WORK.` |
| 120–216 | 10–18 | CHAOS | oversized moving type, black torn strip, stars |
| 216–312 | 18–26 | CASES | stacked prints, `GOOD IDEAS DON'T SIT STILL.` |
| 312–408 | 26–34 | PUNCH | `CREATE.` → `MAKE.` → `MOVE.`, hard snaps |
| 408–480 | 34–40 | CALM | `MAKE IT MEAN SOMETHING.` |
| 480–504 | 40–42 | END | `LET'S MAKE SOMETHING GOOD.` — hard out, no fade |

---

## Palette

| | |
|---|---|
| Paper | `#E9E7E0` |
| Grey | `#D5D3CC` |
| Ink | `#111111` |
| Accent | `#FF1E16` |

One accent colour, used sparingly and aggressively. The piece is deliberately
not colourful.

---

## Notes

- **Outstanding:** only 1 of 18 campaign images is in `assets/img/`. Chrome
  blocks automatic downloads from instagram.com, so the rest need that
  permission granted first — see `tools/fetch_ig.md`. Missing images render as
  clearly-marked placeholders, so nothing breaks in the meantime.
- **Encoding:** the web master is CRF 26 (~9 MB). Grain is expensive to encode;
  CRF 16 produces ~200 MB for the same 21 seconds, over GitHub's 100 MB file
  limit, with no visible improvement. `tools/build.sh master` if you want it.
- **Silent by design.** To add a 120 BPM track later:
  `ffmpeg -i out/portfolio_1080x1920_24fps.mp4 -i track.wav -c:v copy -shortest out/final.mp4`
- Missing images fall back to a labelled placeholder, so the edit always renders.
- Fonts are vendored in `assets/fonts/` — no network call at render time.
