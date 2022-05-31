#!/usr/bin/env python

import sys
if sys.version_info.major < 3:
    import BaseHTTPServer
    import SimpleHTTPServer
    baseServer = BaseHTTPServer
    simpleServer = SimpleHTTPServer
else:
    import http.server
    baseServer = http.server
    simpleServer = http.server

class NoCacheHandler(simpleServer.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate, post-check=0, pre-check=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")

        simpleServer.SimpleHTTPRequestHandler.end_headers(self)

def serve(address):
    httpd = baseServer.HTTPServer(address, NoCacheHandler)
    sa = httpd.socket.getsockname()
    print("Serving HTTP on", sa[0], "port", sa[1], "...")
    httpd.serve_forever()

if __name__ == "__main__":
    if sys.argv[1:]:
        port = int(sys.argv[1])
    else:
        port = 8000

    # We want to bind to localhost only
    serve(('127.0.0.1', port))
