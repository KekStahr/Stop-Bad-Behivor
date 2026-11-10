import threading, time
class AudioPlayer:
    def __init__(self):
        self.is_playing = False
    def start_binaural_noise(self):
        self.is_playing = True
        def loop():
            import winsound
            while self.is_playing:
                winsound.Beep(440, 500)
                time.sleep(1)
        threading.Thread(target=loop, daemon=True).start()
    def stop(self):
        self.is_playing = False