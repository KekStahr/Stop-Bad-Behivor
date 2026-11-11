import requests
class EmergencyNotifier:
    @staticmethod
    def send_alert(webhook_url, word):
        if webhook_url:
            try: requests.post(webhook_url, json={"content": f"🚨 Reşo Alarm: Trigger '{word}' getippt!"}, timeout=3)
            except: pass