#!/usr/bin/env python3
"""
Ward-Beck Systems XTM-4 Standalone Local Server
Serves the XTM standalone web app and launches your default browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable caching during local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)
    port = PORT
    max_tries = 10
    httpd = None

    for i in range(max_tries):
        try:
            socketserver.TCPServer.allow_reuse_address = True
            httpd = socketserver.TCPServer(("", port), Handler)
            break
        except OSError:
            port += 1

    if not httpd:
        print(f"Error: Could not bind to ports {PORT}-{PORT + max_tries}")
        sys.exit(1)

    url = f"http://localhost:{port}"
    print("=" * 68)
    print("  Ward-Beck Systems — XTM-4 Precision Audio Test Meter")
    print(f"  Local Server Running at: {url}")
    print("=" * 68)
    print("  • Listening to Soundcard: Click 'Listen to Soundcard'")
    print("  • Listening to Computer Audio Output: Click 'Listen to Computer Output'")
    print("  • Press Ctrl+C to stop the server.")
    print("=" * 68)

    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
