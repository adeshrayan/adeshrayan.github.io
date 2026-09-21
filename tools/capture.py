"""
capture.py — drive headless Chrome over CDP and write one PNG per frame.

One browser, one page, 504 screenshots. The page exposes window.drawFrame(n)
which renders deterministically, so captures are exact and repeatable.
"""
import base64, json, os, shutil, socket, subprocess, sys, time
from urllib.request import urlopen
import websocket   # from .venv

ROOT    = os.path.expanduser("~/portfolio")
FRAMES  = os.path.join(ROOT, "frames")
CHROME  = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT    = 9222
URL     = "http://127.0.0.1:8080/render.html?capture=1"
W, H    = 1080, 1920

def free_port(p):
    s = socket.socket()
    try:
        s.connect(("127.0.0.1", p)); s.close(); return False
    except Exception:
        return True

def launch():
    profile = "/tmp/_chrome_capture_profile"
    shutil.rmtree(profile, ignore_errors=True)
    args = [
        CHROME,
        "--headless=new",
        f"--remote-debugging-port={PORT}",
        "--remote-allow-origins=*",
        f"--user-data-dir={profile}",
        f"--window-size={W},{H}",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--mute-audio",
        # determinism / no surprise network
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        URL,
    ]
    return subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def ws_url(timeout=25):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            tabs = json.loads(urlopen(f"http://127.0.0.1:{PORT}/json").read())
            for t in tabs:
                if t.get("type") == "page" and t.get("webSocketDebuggerUrl"):
                    return t["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(0.35)
    raise RuntimeError("Chrome devtools never came up")

class CDP:
    def __init__(self, url):
        self.ws = websocket.create_connection(url, timeout=60)
        self.i = 0
    def send(self, method, **params):
        self.i += 1
        self.ws.send(json.dumps({"id": self.i, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.i:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})
    def eval(self, expr, await_promise=False):
        r = self.send("Runtime.evaluate", expression=expr, returnByValue=True,
                      awaitPromise=await_promise)
        return r.get("result", {}).get("value")

def main():
    if len(sys.argv) > 1 and "," in sys.argv[1]:
        frames = [int(x) for x in sys.argv[1].split(",")]
    else:
        start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
        end   = int(sys.argv[2]) if len(sys.argv) > 2 else 504
        frames = list(range(start, end))

    os.makedirs(FRAMES, exist_ok=True)
    proc = launch()
    try:
        cdp = CDP(ws_url())
        cdp.send("Page.enable")
        cdp.send("Runtime.enable")
        cdp.send("Emulation.setDeviceMetricsOverride",
                 width=W, height=H, deviceScaleFactor=1, mobile=False)

        # wait for fonts + images + baked textures
        t0 = time.time()
        while time.time() - t0 < 45:
            if cdp.eval("window.__ready === true"):
                break
            time.sleep(0.3)
        else:
            raise RuntimeError("page never signalled ready")

        missing = cdp.eval("JSON.stringify(Object.entries(IMG).filter(([k,v])=>!v).map(([k])=>k))")
        if missing and missing != "[]":
            print(f"  note: missing images -> {missing}", flush=True)

        t0 = time.time()
        for n_i, f in enumerate(frames):
            cdp.eval(f"window.drawFrame({f})")
            shot = cdp.send("Page.captureScreenshot", format="png",
                            clip={"x":0,"y":0,"width":W,"height":H,"scale":1},
                            captureBeyondViewport=True)
            with open(os.path.join(FRAMES, f"f{f:05d}.png"), "wb") as fh:
                fh.write(base64.b64decode(shot["data"]))
            if n_i % 24 == 0 or n_i == len(frames) - 1:
                el = time.time() - t0
                done = n_i + 1
                rate = done / el if el else 0
                eta = (len(frames) - done) / rate if rate else 0
                print(f"  frame {f:4d} ({done}/{len(frames)})  {rate:5.1f} fps  eta {eta:5.1f}s", flush=True)
        print(f"done: {len(frames)} frames in {time.time()-t0:.1f}s", flush=True)
    finally:
        proc.terminate()
        try: proc.wait(timeout=8)
        except Exception: proc.kill()

if __name__ == "__main__":
    main()
