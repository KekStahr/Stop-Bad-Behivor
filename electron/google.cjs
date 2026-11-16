// Google sign-in for an installed desktop app (OAuth 2.0 + PKCE, loopback redirect).
// The refresh token is encrypted with the OS keychain (Electron safeStorage).
const crypto = require("node:crypto");
const http = require("node:http");

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

const base64url = (buffer) => buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const page = (text) => `<!doctype html><meta charset="utf-8"><title>Reşo</title><body style="font-family:system-ui;background:#111;color:#eee;display:grid;place-items:center;height:90vh"><p>${text}</p></body>`;

function createGoogle({ store, safeStorage, openExternal }) {
  const config = () => store.data.google_oauth_client || {};
  const clientId = () => (process.env.GOOGLE_OAUTH_CLIENT_ID || config().client_id || "").trim();
  const clientSecret = () => (process.env.GOOGLE_OAUTH_CLIENT_SECRET || config().client_secret || "").trim();

  async function tokenRequest(params) {
    const secret = clientSecret();
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId(), ...(secret ? { client_secret: secret } : {}), ...params }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token) throw new Error(payload.error_description || "Google hat die Anmeldung abgelehnt.");
    return payload;
  }

  function storeRefreshToken(token) {
    store.data.google_refresh_token_enc = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(token).toString("base64")
      : null;
    if (!store.data.google_refresh_token_enc) throw new Error("Sichere Speicherung ist auf diesem System nicht verfügbar.");
    store.save();
  }

  function refreshToken() {
    const encrypted = store.data.google_refresh_token_enc;
    if (!encrypted) throw new Error("Bitte melde dich erneut mit Google an.");
    return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
  }

  // Starts a loopback server and resolves once it listens; `code` resolves with Google's answer.
  function loopback(state, timeoutMs) {
    return new Promise((ready, fail) => {
      let finish;
      const code = new Promise((resolve, reject) => { finish = { resolve, reject }; });
      const server = http.createServer((request, response) => {
        const url = new URL(request.url, "http://127.0.0.1");
        if (url.pathname !== "/") {
          response.writeHead(404);
          response.end();
          return;
        }
        let message = "Anmeldung erfolgreich. Du kannst dieses Fenster schließen und zu Reşo zurückkehren.";
        let error = null;
        if (url.searchParams.get("state") !== state) error = new Error("OAuth-Prüfung fehlgeschlagen.");
        else if (url.searchParams.get("error")) error = new Error("Google-Anmeldung wurde abgebrochen.");
        else if (!url.searchParams.get("code")) error = new Error("Kein Autorisierungscode erhalten.");
        if (error) message = "Anmeldung nicht abgeschlossen. Du kannst dieses Fenster schließen.";
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(page(message));
        clearTimeout(timer);
        server.close();
        if (error) finish.reject(error);
        else finish.resolve(url.searchParams.get("code"));
      });
      const timer = setTimeout(() => {
        server.close();
        finish.reject(new Error("Zeitüberschreitung bei der Google-Anmeldung."));
      }, timeoutMs);
      server.once("error", fail);
      server.listen(0, "127.0.0.1", () => ready({ redirectUri: `http://127.0.0.1:${server.address().port}/`, code }));
    });
  }

  async function login({ calendar = true } = {}) {
    if (!clientId()) throw new Error("Google-Anmeldung ist noch nicht eingerichtet.");
    const state = base64url(crypto.randomBytes(24));
    const verifier = base64url(crypto.randomBytes(48));
    const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
    const { redirectUri, code: codePromise } = await loopback(state, 5 * 60000);
    const scopes = ["openid", "email", "profile", ...(calendar ? [CALENDAR_SCOPE] : [])];
    await openExternal(`${AUTHORIZE_URL}?${new URLSearchParams({
      client_id: clientId(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    })}`);
    const code = await codePromise;
    const tokens = await tokenRequest({ code, code_verifier: verifier, grant_type: "authorization_code", redirect_uri: redirectUri });
    if (!tokens.refresh_token) throw new Error("Google hat kein Refresh-Token ausgegeben. Bitte den Zugriff erneut erlauben.");
    storeRefreshToken(tokens.refresh_token);
    const info = await (await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}` } })).json();
    if (!info.sub) throw new Error("Google hat keine gültige Konto-ID zurückgegeben.");
    return { sub: info.sub, email: info.email || "", calendar: String(tokens.scope || "").includes(CALENDAR_SCOPE) };
  }

  async function accessToken() {
    return (await tokenRequest({ refresh_token: refreshToken(), grant_type: "refresh_token" })).access_token;
  }

  async function logout() {
    try {
      await fetch(REVOKE_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: refreshToken() }) });
    } finally {
      delete store.data.google_refresh_token_enc;
      store.save();
    }
  }

  async function createEvent(event) {
    const response = await fetch(EVENTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (response.status === 403) throw new Error("Reşo hat keinen Zugriff auf deinen Google Kalender. Bitte neu anmelden und den Kalender erlauben.");
    if (!response.ok) throw new Error(`Kalender-Eintrag fehlgeschlagen (${response.status}).`);
    return (await response.json()).id;
  }

  async function deleteEvent(id) {
    const response = await fetch(`${EVENTS_URL}/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${await accessToken()}` } });
    if (![200, 204, 404, 410].includes(response.status)) throw new Error(`Kalender-Eintrag konnte nicht gelöscht werden (${response.status}).`);
  }

  return { clientId, login, logout, accessToken, createEvent, deleteEvent };
}

module.exports = { createGoogle };
