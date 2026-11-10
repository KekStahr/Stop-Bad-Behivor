# Stop-Bad-Behivor
This is a program that is very effective at stopping you from engaging in bad habits.

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
be retried with **Jetzt sichern**.
