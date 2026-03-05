"""Simulator entry point.

Starts the Prometheus HTTP server and launches the simulation loop.
"""

from prometheus_client import start_http_server

from plugins.simulator.process.loop import simulate

if __name__ == "__main__":
    start_http_server(9000)
    simulate()
