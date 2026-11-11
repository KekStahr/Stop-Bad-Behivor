from .shared import *


class CloudBackupMixin:
    def _schedule_cloud_backup(self):
        if not self.data.get("account_id"):
            return
        with self._backup_sync_lock:
            self._backup_sync_pending = True
            if self._backup_sync_thread and self._backup_sync_thread.is_alive():
                return
            self._backup_sync_thread = threading.Thread(
                target=self._run_cloud_backup_queue,
                daemon=True,
            )
            self._backup_sync_thread.start()
    def _run_cloud_backup_queue(self):
        while True:
            with self._backup_sync_lock:
                if not self._backup_sync_pending:
                    self._backup_sync_thread = None
                    return
                self._backup_sync_pending = False
            self.sync_full_backup()
    def sync_full_backup(self):
        account_id = self.data.get("account_id")
        if not account_id:
            self.last_cloud_backup_error = "Kein Google-Konto verbunden."
            return False
        try:
            from backend.integrations.google_oauth import get_google_access_token

            token = get_google_access_token(account_id)
            if self.data.get("cloud_backup_dirty"):
                return self.upload_full_backup(token)

            response = requests.get(
                RESTORE_URL,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            if response.status_code == 404:
                return self.upload_full_backup(token)
            response.raise_for_status()
            backup = response.json().get("stats_data")
            if not isinstance(backup, dict):
                raise ValueError("Das Cloud-Backup hat ein ungültiges Format.")

            self.data.update(
                {
                    key: value
                    for key, value in backup.items()
                    if key not in PRIVATE_BACKUP_KEYS
                }
            )
            self.data["cloud_backup_initialized"] = True
            self.data["cloud_backup_dirty"] = False
            self._write_local_data()
            self.last_cloud_backup_error = None
            return True
        except Exception as error:
            self.last_cloud_backup_error = str(error)
            logging.exception("Cloud-Synchronisierung konnte nicht abgeschlossen werden.")
            return False
    def upload_full_backup(self, access_token=None):
        account_id = self.data.get("account_id")
        if not account_id:
            self.last_cloud_backup_error = "Kein Google-Konto verbunden."
            return False

        try:
            from backend.integrations.google_oauth import get_google_access_token

            token = access_token or get_google_access_token(account_id)
            stats_data = {
                key: value
                for key, value in self.data.items()
                if key not in PRIVATE_BACKUP_KEYS
            }
            response = requests.post(
                BACKUP_URL,
                json={"stats_data": stats_data},
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            response.raise_for_status()
            self.last_cloud_backup_error = None
            self.data["cloud_backup_initialized"] = True
            self.data["cloud_backup_dirty"] = False
            self._write_local_data()
            return True
        except Exception as error:
            self.last_cloud_backup_error = str(error)
            logging.exception("Cloud-Backup konnte nicht hochgeladen werden.")
            return False
    def download_full_backup(self):
        account_id = self.data.get("account_id")
        if not account_id:
            self.last_cloud_backup_error = "Kein Google-Konto verbunden."
            return False

        try:
            from backend.integrations.google_oauth import get_google_access_token

            token = get_google_access_token(account_id)
            response = requests.get(
                RESTORE_URL,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            if response.status_code == 404:
                self.last_cloud_backup_error = "Für dieses Konto wurde kein Backup gefunden."
                return False
            response.raise_for_status()
            backup = response.json().get("stats_data")
            if not isinstance(backup, dict):
                raise ValueError("Das Cloud-Backup hat ein ungültiges Format.")

            self.data.update(
                {
                    key: value
                    for key, value in backup.items()
                    if key not in PRIVATE_BACKUP_KEYS
                }
            )
            self.data["cloud_backup_initialized"] = True
            self.data["cloud_backup_dirty"] = False
            self._write_local_data()
            self.last_cloud_backup_error = None
            return True
        except Exception as error:
            self.last_cloud_backup_error = str(error)
            logging.exception("Cloud-Backup konnte nicht wiederhergestellt werden.")
            return False
    def connect_google_account(self, userinfo, token_data):
        account_id = userinfo["sub"]
        refresh_token = token_data.get("refresh_token")
        if not refresh_token:
            raise ValueError("Google hat kein Refresh-Token ausgegeben.")
        from backend.integrations.google_oauth import store_google_refresh_token

        store_google_refresh_token(account_id, refresh_token)
        self.data["account_id"] = account_id
        self.data["google_account_email"] = userinfo.get("email", "")
        self.data["cloud_backup_initialized"] = False
        self.data["cloud_backup_dirty"] = False
        self.save_data(sync_cloud_backup=False)
        return True
    def disconnect_google_account(self):
        account_id = self.data.get("account_id")
        if account_id:
            from backend.integrations.google_oauth import revoke_google_refresh_token

            revoke_google_refresh_token(account_id)
        self.data.pop("account_id", None)
        self.data.pop("google_account_email", None)
        self.data.pop("cloud_backup_initialized", None)
        self.data.pop("cloud_backup_dirty", None)
        self.save_data(sync_cloud_backup=False)
    def sync_with_cloud(self):
        try:
            payload = {
                "username": "reso_user",
                "streak": self.data.get("streak", 0),
                "longest_streak": self.data.get("longest_streak", 0),
                "total_focus_minutes": self.data.get("total_focus_minutes", 0),
                "habits_prevented": self.data.get("habits_prevented", 0)
            }
            requests.post(CLOUD_URL, json=payload, timeout=3)
        except Exception:
            pass
