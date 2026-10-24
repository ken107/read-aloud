# Serves this folder with cross-origin isolation (needed for WASM threads) and
# saves the benchmark's POSTed results to results.json, then exits.
import http.server, os, threading
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'credentialless')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def do_POST(self):
        body = self.rfile.read(int(self.headers['Content-Length']))
        open('results.json', 'wb').write(body)
        self.send_response(204); self.end_headers()
        print(body.decode(), flush=True); threading.Thread(target=server.shutdown).start()
    def log_message(self, *a): pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 8799), H)
print('Open http://localhost:8799/ in Chrome', flush=True); server.serve_forever()
