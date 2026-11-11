import re
import sys
from urllib.parse import urlsplit

HOSTS_PATH = r"C:\Windows\System32\drivers\etc\hosts" if sys.platform == "win32" else "/etc/hosts"
REDIRECT_IP = "127.0.0.1"
RESO_MARKER = "# RESO-BLOCK"

class HostsBlocker:
    @staticmethod
    def _normalize_domain(value):
        value = value.strip().lower()
        if "://" in value:
            value = urlsplit(value).hostname or ""
        else:
            value = value.split("/", 1)[0]
            if ":" in value:
                return ""

        value = value.rstrip(".")
        if not re.fullmatch(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", value):
            return ""
        return value

    @classmethod
    def update_domains(cls, domains):
        if sys.platform != "win32":
            return False

        blocked_domains = set()
        for value in domains:
            domain = cls._normalize_domain(value)
            if domain:
                base_domain = domain[4:] if domain.startswith("www.") else domain
                blocked_domains.update((base_domain, f"www.{base_domain}"))

        try:
            with open(HOSTS_PATH, "r+", encoding="utf-8") as file:
                lines = [line for line in file.read().splitlines() if RESO_MARKER not in line]
                lines.extend(
                    f"{REDIRECT_IP} {domain} {RESO_MARKER}"
                    for domain in sorted(blocked_domains)
                )
                file.seek(0)
                file.write("\n".join(lines) + "\n")
                file.truncate()
            return True
        except Exception:
            return False

    @classmethod
    def block_domains(cls, domains):
        return cls.update_domains(domains)