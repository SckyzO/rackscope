"""Simulator entry point.

Starts the Prometheus metrics server (port 9000) and a minimal control
server (port 9001), then launches the simulation loop.

Control endpoints:
  POST /restart  — exits the process so Docker restarts the container
"""

import os
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from prometheus_client import start_http_server

from plugins.simulator.process.loop import simulate


class _ControlHandler(BaseHTTPRequestHandler):
    """Minimal control server — handles POST /restart."""

    def do_POST(self):
        if self.path == "/restart":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"restarting"}')
            self.wfile.flush()
            # Exit after the response is sent; Docker restarts the container
            threading.Thread(target=lambda: os._exit(0), daemon=True).start()
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *_):  # suppress access logs
        pass


def _start_control_server(port: int = 9001) -> None:
    server = HTTPServer(("", port), _ControlHandler)
    thread = threading.Thread(target=server.serve_forever, name="control-server")
    thread.daemon = True
    thread.start()
    print(f"Control server listening on :{port}")


if __name__ == "__main__":
    start_http_server(9000)
    _start_control_server(9001)
    simulate()
