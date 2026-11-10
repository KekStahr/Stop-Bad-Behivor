# Stop-Bad-Behivor
This is a program that is very effective at stopping you from engaging in bad habits.

## Tray and shutdown countdown

Closing the main window minimizes the app to the system tray. Choosing
**Beenden (30 Min. Wartezeit)** in the tray starts a 30-minute countdown; the app
stays active in the background and closes when the countdown ends. The deadline
is saved locally, so the remaining time resumes if the app is restarted before
the countdown expires. The countdown is shown on the Home tab and can be
cancelled there; the app remains usable while it runs. Windows or a user with
access to the local app data can still terminate or modify the app or change
the system clock; this is not an operating-system-enforced lock.

## Google Cloud Backup

The desktop app uses Google's installed-application OAuth flow with PKCE. Create
an OAuth client of type **Desktop app** in Google Cloud Console and set its
client ID in `GOOGLE_OAUTH_CLIENT_ID` before starting the app. If Google
provides a client secret for that desktop client, set it as
`GOOGLE_OAUTH_CLIENT_SECRET` as well. Desktop OAuth client secrets are not
confidential; never reuse a web-server client secret here. On Windows, for
example, set the client ID for the current PowerShell session with
`$env:GOOGLE_OAUTH_CLIENT_ID = "your-desktop-client-id"`.

Install the desktop requirements with `pip install -r requirements.txt`.
Deploy the FastAPI app with `server` as the service root, install
`server/requirements.txt`, and start it with
`uvicorn main:app --host 0.0.0.0 --port $PORT`. Configure `DATABASE_URL` for
the deployment. The desktop currently targets the Reşo API URL defined in
`stats.py`; set `RESO_CLOUD_URL` to the deployed server's `/sync` endpoint if it
differs. Deploy the updated server before using cloud backup.

After Google sign-in, choose either **Jetzt sichern** or
**Aus Cloud wiederherstellen**. Restore replaces local progress and preferences,
so the app asks for confirmation first. PINs and Discord webhook URLs remain
local and are excluded by both client and server. The refresh token is stored
in the operating system keyring. Once a backup has been initialized, later
local changes are uploaded automatically; offline failures are logged and can
be retried with **Jetzt sichern**. Reframing/emotion history and trigger
timestamps remain local because they can contain sensitive personal data.

## Anonymous support chat

The optional support chat matches one seeker with one helper over the FastAPI
WebSocket endpoint. Deploy the updated server and its `server/requirements.txt`
with Uvicorn's WebSocket support enabled; the desktop derives the `ws`/`wss`
URL from `RESO_CLOUD_URL`. The chat is in-memory and single-process: messages,
rooms, and the waiting queue are not persisted, and running multiple server
workers does not share matches. Chat starts only after the user confirms in the
window. Participants are anonymous but not verified; do not share identifying
or contact information. No account identity is sent to chat partners, but the
desktop shares your streak and rank as profile information when matched. These
values are not independently verified. Text, stickers, and PNG/JPEG images up
to 500 KB can be relayed; they are not persisted by the chat service. The server
operator may see connection metadata. The chat is not a crisis or professional
support service. Message size, queue size, and per-connection send rate are
limited.

## Community forum

The Community tab is a public pseudonymous forum. Posts and comments are stored
by the configured community API and are visible to other app users. It supports
text, PNG/JPEG images and GIF files up to 500 KB, comments, stickers and emoji
reactions. The app creates a local pseudonymous identity; forum names are not
verified accounts, and anyone with access to the API can post. The forum has no
moderation tools yet. Do not share personal or sensitive information. Deploy
the updated `server` API to enable the forum. Animated GIF previews are shown
in the desktop feed.

## Analytics models

The Analytics tab includes focus-time equivalents (estimated pages, kilometers,
and books) and a hyperbolic discounting curve. These are illustrative
calculations based on configurable example assumptions, not measured outcomes
or clinical assessments.
