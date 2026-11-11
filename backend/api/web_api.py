import json
import logging
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class LocalWebApi:
    MAX_BODY_SIZE = 64 * 1024

    def __init__(self, dispatch):
        self.dispatch = dispatch
        self.token = os.environ.get("RESO_API_TOKEN", "")
        self.port = int(os.environ.get("RESO_API_PORT", "0"))
        if len(self.token) < 32:
            raise RuntimeError("RESO_API_TOKEN muss mindestens 32 Zeichen enthalten.")

        api = self

        class RequestHandler(BaseHTTPRequestHandler):
            def do_OPTIONS(self):
                if not self._allow_origin():
                    self.send_error(403)
                    return
                self.send_response(204)
                self._cors_headers()
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Reso-Token")
                self.end_headers()

            def do_GET(self):
                self._handle_request()

            def do_POST(self):
                self._handle_request()

            def log_message(self, _format, *_args):
                logging.getLogger("reso.local_api").debug(_format, *_args)

            def _allow_origin(self):
                origin = self.headers.get("Origin")
                return origin is None or origin in {"null", "file://", "reso://app"}

            def _cors_headers(self):
                origin = self.headers.get("Origin")
                if origin is not None:
                    self.send_header("Access-Control-Allow-Origin", origin)
                    self.send_header("Vary", "Origin")

            def _handle_request(self):
                if not self._allow_origin():
                    self.send_error(403)
                    return
                if self.path == "/health" and self.command == "GET":
                    self._respond(200, {"ready": True}, authenticated=False)
                    return
                if self.headers.get("X-Reso-Token") != api.token:
                    self.send_error(401)
                    return

                body = {}
                if self.command == "POST":
                    try:
                        content_length = int(self.headers.get("Content-Length", "0"))
                    except ValueError:
                        self.send_error(400)
                        return
                    if content_length < 0 or content_length > api.MAX_BODY_SIZE:
                        self.send_error(413)
                        return
                    try:
                        raw_body = self.rfile.read(content_length)
                        body = json.loads(raw_body.decode("utf-8")) if raw_body else {}
                    except (UnicodeDecodeError, json.JSONDecodeError):
                        self.send_error(400)
                        return
                    if not isinstance(body, dict):
                        self.send_error(400)
                        return

                response = threading.Event()
                result = {}
                api.dispatch(self.command, self.path, body, response, result)
                if not response.wait(timeout=12):
                    self._respond(
                        504,
                        {"error": "Die App hat nicht rechtzeitig geantwortet."},
                    )
                    return
                self._respond(result.get("status", 500), result.get("body", {}))

            def _respond(self, status, payload, authenticated=True):
                encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(status)
                self._cors_headers()
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(encoded)))
                if authenticated:
                    self.send_header("X-Content-Type-Options", "nosniff")
                self.end_headers()
                self.wfile.write(encoded)

        self.server = ThreadingHTTPServer(("127.0.0.1", self.port), RequestHandler)
        self.server.daemon_threads = True
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()
