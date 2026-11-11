from .shared import *


class CommunityStatsMixin:
    def get_community_stats(self):
        try:
            response = requests.get(COMMUNITY_URL, timeout=3)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None
    def get_community_settings(self) -> dict:
        settings = self.data.setdefault(
            "community_chat_settings",
            {
                "auto_connect_trigger": True,
                "allow_helper_mode": True,
            },
        )
        if not isinstance(settings, dict):
            settings = {
                "auto_connect_trigger": True,
                "allow_helper_mode": True,
            }
            self.data["community_chat_settings"] = settings
        return {
            "auto_connect_trigger": bool(settings.get("auto_connect_trigger", True)),
            "allow_helper_mode": bool(settings.get("allow_helper_mode", True)),
        }
    def update_community_settings(self, auto_connect: bool, allow_helper: bool):
        self.data["community_chat_settings"] = {
            "auto_connect_trigger": bool(auto_connect),
            "allow_helper_mode": bool(allow_helper),
        }
        self.save_data()
    @staticmethod
    def get_support_chat_url(role: str) -> str:
        if role not in {"seeker", "helper"}:
            raise ValueError("Unbekannte Chat-Rolle.")
        parsed = urlsplit(CLOUD_URL)
        scheme = "wss" if parsed.scheme == "https" else "ws"
        base_path = parsed.path.rsplit("/sync", 1)[0].rstrip("/")
        path = f"{base_path}/ws/support-chat/{role}"
        return urlunsplit((scheme, parsed.netloc, path, "", ""))
    def get_community_leaderboard(self):
        try:
            response = requests.get(
                f"{COMMUNITY_URL.rsplit('/community', 1)[0]}/community/leaderboard",
                timeout=3,
            )
            response.raise_for_status()
            leaderboard = response.json().get("leaderboard", [])
            return leaderboard if isinstance(leaderboard, list) else []
        except requests.RequestException as error:
            logging.warning("Community-Rangliste nicht verfügbar: %s", error)
            return []
    def get_community_identity(self):
        author_id = self.data.get("community_author_id")
        if (
            not isinstance(author_id, str)
            or len(author_id) != 32
            or any(character not in "0123456789abcdef" for character in author_id)
        ):
            author_id = secrets.token_hex(16)
            self.data["community_author_id"] = author_id
        author_name = self.data.get("community_author_name")
        if not isinstance(author_name, str) or not author_name.strip():
            author_name = f"Gast-{author_id[:6]}"
            self.data["community_author_name"] = author_name
        self._write_local_data()
        return author_id, author_name
    def set_community_author_name(self, author_name):
        if not isinstance(author_name, str):
            raise TypeError("Der Community-Name muss Text sein.")
        author_name = " ".join(author_name.split())
        if not author_name or len(author_name) > 32 or not author_name.isprintable():
            raise ValueError("Der Name muss 1 bis 32 druckbare Zeichen enthalten.")
        self.data["community_author_name"] = author_name
        self._write_local_data()
