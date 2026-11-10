import time
import threading

class FocusTimer:
    def __init__(self, update_callback, finish_callback):
        self.update_callback = update_callback
        self.finish_callback = finish_callback
        self.remaining_seconds = 0
        self.total_duration_minutes = 0
        self.is_running = False
        self._thread = None

    def start(self, minutes):
        if self.is_running:
            return
        self.total_duration_minutes = minutes
        self.remaining_seconds = minutes * 60
        self.is_running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        while self.remaining_seconds > 0 and self.is_running:
            time.sleep(1)
            self.remaining_seconds -= 1
            mins, secs = divmod(self.remaining_seconds, 60)
            if self.update_callback:
                self.update_callback(f"{mins:02d}:{secs:02d}")
        
        if self.remaining_seconds == 0 and self.is_running:
            self.is_running = False
            if self.finish_callback:
                self.finish_callback(self.total_duration_minutes)

    def stop(self):
        self.is_running = False