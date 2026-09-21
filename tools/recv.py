"""Tiny local receiver: the browser POSTs image bytes here, we write them to assets/img.
Avoids Chrome's multi-download blocking and keeps signed CDN URLs out of the agent context."""
import os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs, unquote

OUT = os.path.expanduser("~/portfolio/assets/img")
os.makedirs(OUT, exist_ok=True)

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "text/plain"); self.end_headers()
        self.wfile.write(b"ok")

    def do_POST(self):
        q = parse_qs(urlparse(self.path).query)
        name = unquote(q.get("name", ["unnamed.bin"])[0])
        name = os.path.basename(name).replace("..", "_")
        n = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(n)
        with open(os.path.join(OUT, name), "wb") as f:
            f.write(data)
        print(f"saved {name} ({len(data)} bytes)", flush=True)
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "text/plain"); self.end_headers()
        self.wfile.write(b"saved")

    def log_message(self, *a):  # silence default noise
        pass

if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8765), H).serve_forever()
