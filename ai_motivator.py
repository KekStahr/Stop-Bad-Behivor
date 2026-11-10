import random
import threading
import time
import requests
import tkinter as tk
from tkinter import messagebox

class MotivationManager:
    def __init__(self, stats_manager):
        self.stats_manager = stats_manager
        self.is_running = False
        self._thread = None

        # Standard-Fallback KI-Nachrichten (nach wissenschaftlicher Verhaltenstherapie gegliedert)
        self.fallback_quotes = [
            "Blick vom Bildschirm weg! 20 Sekunden in die Ferne schauen schützt deine Augen.",
            "Mach kurz Halt. Frage dich: Arbeitest du gerade fokussiert oder weichst du einer Aufgabe aus?",
            "Zeit für 10 tiefe Atemzüge. Dehne deine Schultern und trinke einen Schluck Wasser.",
            "Disziplin bedeutet, zu wählen, was du JETZT willst vs. was du AM MEISTEN willst.",
            "Steh auf, schüttle deine Arme aus. 2 Minuten Bewegung reichen, um dein Gehirn zu resetten.",
            "Ein kurzer Moment der Schwäche ruiniert Stunden des Fortschritts. Bleib stark!",
            "Pause machen heißt nicht aufgeben – es schützt deine mentale Energie für echte Ziele."
        ]

    def get_ai_quote(self):
        """Holt eine dynamische KI-Motivationsnachricht über ein freies LLM-API-Interface oder nimmt ein Fallback."""
        try:
            # Schneller Aufruf eines leichten KI-Endpunkts (Beispiel: AdviceSlip / Quotable)
            res = requests.get("https://api.adviceslip.com/advice", timeout=3)
            if res.status_code == 200:
                advice = res.json().get("slip", {}).get("advice", "")
                if advice:
                    return f"💡 KI-Reflexion: '{advice}'\n\nNimm dir 2 Minuten Pause vom Bildschirm!"
        except Exception:
            pass
        return random.choice(self.fallback_quotes)

    def start_scheduler(self, mode, fixed_mins=15, min_rand=10, max_rand=20):
        self.stop_scheduler()
        self.is_running = True
        self._thread = threading.Thread(
            target=self._run_loop,
            args=(mode, fixed_mins, min_rand, max_rand),
            daemon=True
        )
        self._thread.start()

    def stop_scheduler(self):
        self.is_running = False

    def _run_loop(self, mode, fixed_mins, min_rand, max_rand):
        while self.is_running:
            if mode == "random":
                wait_minutes = random.randint(min_rand, max_rand)
            else:
                wait_minutes = fixed_mins

            # Schlafen in 1-Sekunden-Schritten für sauberes Abbrechen
            for _ in range(wait_minutes * 60):
                if not self.is_running:
                    return
                time.sleep(1)

            if self.is_running:
                self.show_notification()

    def show_notification(self):
        msg = self.get_ai_quote()
        try:
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            messagebox.showinfo("Reşo : Bildschirm-Pause & KI-Impuls", msg)
            root.destroy()
        except Exception:
            pass