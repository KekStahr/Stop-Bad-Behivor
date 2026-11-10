import base64
import hashlib
import os
import secrets
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlencode, urlparse

import keyring
import requests


GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
KEYRING_SERVICE = "ResoApp Google Cloud Backup"


def _client_id():
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()
    if not client_id:
        raise RuntimeError(
            "Google-Login ist nicht eingerichtet: GOOGLE_OAUTH_CLIENT_ID fehlt. "
            "Lege in der Google Cloud Console einen OAuth-Client vom Typ "
            "'Desktop-App' an, setze die Client-ID als Umgebungsvariable und "
            "starte Reşo danach neu. Details stehen in README.md."
        )
    return client_id


def _client_secret():
    return os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()


def _token_request(payload):
    response = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
    response.raise_for_status()
    token_data = response.json()
    if not token_data.get("access_token"):
        raise RuntimeError("Google hat kein Access-Token zurückgegeben.")
    return token_data


def _get_userinfo(access_token):
    response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    response.raise_for_status()
    userinfo = response.json()
    if not userinfo.get("sub"):
        raise RuntimeError("Google hat keine gültige Konto-ID zurückgegeben.")
    return userinfo


def login_with_google(timeout=300):
    client_id = _client_id()
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode("ascii")).digest()
    ).decode("ascii").rstrip("=")
    result = {}

    class CallbackHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            query = parse_qs(urlparse(self.path).query)
            if query.get("state", [None])[0] != state:
                result["error"] = "OAuth-State-Prüfung fehlgeschlagen."
                status_code = 400
                page = "Anmeldung fehlgeschlagen. Du kannst dieses Fenster schließen."
            elif query.get("error"):
                result["error"] = "Google-Anmeldung wurde abgebrochen."
                status_code = 400
                page = "Anmeldung abgebrochen. Du kannst dieses Fenster schließen."
            elif not query.get("code", [None])[0]:
                result["error"] = "Google hat keinen Autorisierungscode geliefert."
                status_code = 400
                page = "Anmeldung fehlgeschlagen. Du kannst dieses Fenster schließen."
            else:
                result["code"] = query["code"][0]
                status_code = 200
                page = "Anmeldung erfolgreich. Du kannst dieses Fenster schließen."

            body = (
                "<!doctype html><meta charset='utf-8'>"
                f"<title>Reşo</title><p>{page}</p>"
            ).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, _format_string, *_args):
            _ = (_format_string, _args)
            return

    server = HTTPServer(("127.0.0.1", 0), CallbackHandler)
    server.timeout = 1
    redirect_uri = f"http://127.0.0.1:{server.server_port}/"
    auth_params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "consent",
    }

    try:
        if not webbrowser.open(f"{GOOGLE_AUTHORIZE_URL}?{urlencode(auth_params)}"):
            raise RuntimeError("Der Browser konnte nicht geöffnet werden.")

        deadline = time.monotonic() + timeout
        while not result and time.monotonic() < deadline:
            server.handle_request()
        if not result:
            raise TimeoutError("Zeitüberschreitung bei der Google-Anmeldung.")
        if "error" in result:
            raise RuntimeError(result["error"])

        token_payload = {
            "client_id": client_id,
            "code": result["code"],
            "code_verifier": verifier,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }
        client_secret = _client_secret()
        if client_secret:
            token_payload["client_secret"] = client_secret
        token_data = _token_request(token_payload)
        if not token_data.get("refresh_token"):
            raise RuntimeError(
                "Google hat kein Refresh-Token ausgegeben. Bitte Zugriff erneut "
                "erteilen und die OAuth-Zustimmung in Google prüfen."
            )
        return _get_userinfo(token_data["access_token"]), token_data
    finally:
        server.server_close()


def get_google_access_token(account_id):
    client_id = _client_id()
    refresh_token = keyring.get_password(KEYRING_SERVICE, account_id)
    if not refresh_token:
        raise RuntimeError("Für dieses Google-Konto ist kein Refresh-Token gespeichert.")

    payload = {
        "client_id": client_id,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    client_secret = _client_secret()
    if client_secret:
        payload["client_secret"] = client_secret
    return _token_request(payload)["access_token"]


def store_google_refresh_token(account_id, refresh_token):
    keyring.set_password(KEYRING_SERVICE, account_id, refresh_token)


def revoke_google_refresh_token(account_id):
    refresh_token = keyring.get_password(KEYRING_SERVICE, account_id)
    if refresh_token:
        response = requests.post(
            GOOGLE_REVOKE_URL,
            data={"token": refresh_token},
            timeout=15,
        )
        response.raise_for_status()
    try:
        keyring.delete_password(KEYRING_SERVICE, account_id)
    except keyring.errors.PasswordDeleteError:
        pass
