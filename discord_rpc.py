import time
class DiscordRPCManager:
    def __init__(self):
        self.rpc = None
        try:
            from pypresence import Presence
            self.rpc = Presence("1234567890")
            self.rpc.connect()
        except Exception:
            pass
    def update_presence(self, state, details):
        if self.rpc:
            try: self.rpc.update(state=state, details=details, start=time.time())
            except: pass
    def close(self):
        if self.rpc:
            try: self.rpc.close()
            except: pass