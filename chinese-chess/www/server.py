"""Simple HTTP server with COOP/COEP headers for SharedArrayBuffer support."""
import http.server
import socketserver

PORT = 8888

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()

with socketserver.TCPServer(('0.0.0.0', PORT), Handler) as httpd:
    print(f'Server running at http://localhost:{PORT}')
    httpd.serve_forever()
