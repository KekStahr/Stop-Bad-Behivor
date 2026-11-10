import threading
import time
import os
import sys
import psutil
from pynput import keyboard
import tkinter as tk
from tkinter import messagebox

class BadBehaviorMonitor:
    def __init__(self, stats_manager, target_processes):
        self.stats_manager = stats_manager
        self.trigger_words = [w.lower() for w in self.stats_manager.get_trigger_words()]
        self.target_processes = target_processes
        self.current_typed = ""
        self.listener = None
        self.active_incident = False
        self.shutdown_timer = None

    def update_trigger_words(self, new_words):
        self.trigger_words = [w.lower() for w in new_words]

    def start_monitoring(self):
        self.listener = keyboard.Listener(on_press=self._on_press)
        self.listener.start()

    def stop_monitoring(self):
        if self.listener:
            self.listener.stop()

    def _on_press(self, key):
        try:
            if hasattr(key, 'char') and key.char:
                self.current_typed += key.char.lower()
                if len(self.current_typed) > 50:
                    self.current_typed = self.current_typed[-50:]
                
                for word in self.trigger_words:
                    if word in self.current_typed:
                        self.current_typed = ""
                        self._trigger_intervention(word)
                        break
        except Exception:
            pass

    def _trigger_intervention(self, word):
        self.stats_manager.add_prevented_habit(word)
        self.active_incident = True
        
        self._kill_target_processes()
        
        if self.shutdown_timer:
            self.shutdown_timer.cancel()
        self.shutdown_timer = threading.Timer(900, self._execute_shutdown)
        self.shutdown_timer.start()

        ai_message = (
            f"⚠️ **REŞO: YOU VS YOU – INTERVENTION** ⚠️\n\n"
            f"Du hast gerade nach '{word}' gesucht oder es getippt. "
            f"Denk an dein Ziel! Ist es das wirklich wert, deine Disziplin für einen billigen Dopamin-Kick wegzuwerfen? "
            f"Du bist hier, um stärker zu werden, nicht um alte Fehler zu wiederholen. Konzentriere dich auf deinen Weg!"
        )
        
        try:
            root = tk.Tk()
            root.withdraw()
            messagebox.showwarning("Reşo : You vs You - ACHTUNG!", ai_message)
            root.destroy()
        except:
            pass

    def _kill_target_processes(self):
        for proc in psutil.process_iter(['name']):
            try:
                p_name = proc.info['name'].lower()
                for target in self.target_processes:
                    if target.lower() in p_name:
                        proc.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass

    def notify_app_closing(self):
        if self.active_incident:
            self._execute_shutdown()

    def _execute_shutdown(self):
        if sys.platform == "win32":
            os.system("shutdown /s /t 1")
        elif sys.platform == "darwin":
            os.system("sudo shutdown -h now")
        else:
            os.system("shutdown now")