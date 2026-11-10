import threading
import sys
import os
import psutil
from pynput import keyboard
import tkinter as tk
from tkinter import messagebox
import requests
import requests
from hosts_blocker import HostsBlocker

class BadBehaviorMonitor:
    def __init__(self, stats_manager, target_processes):
        self.stats_manager = stats_manager
        self.trigger_words = [w.lower() for w in self.stats_manager.get_trigger_words()]
        self.target_processes = target_processes
        self.hosts_blocker = HostsBlocker()
        self.hosts_blocker.update_domains(self.trigger_words)
        self.current_typed = ""
        self.listener = None
        self.active_incident = False
        self.shutdown_timer = None

    def update_trigger_words(self, new_words):
        self.trigger_words = [w.lower() for w in new_words]
        return self.hosts_blocker.update_domains(self.trigger_words)

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
        
        # Webhook an Discord/Partner senden falls hinterlegt
        webhook = self.stats_manager.get_stats().get("webhook_url", "")
        if webhook:
            try:
                requests.post(webhook, json={"content": f"🚨 **Reşo Alarm**: Nutzer hat Trigger '{word}' versucht!"}, timeout=2)
            except:
                pass

        self._kill_target_processes()
        
        if self.shutdown_timer:
            self.shutdown_timer.cancel()
        self.shutdown_timer = threading.Timer(900, self._execute_shutdown)
        self.shutdown_timer.start()

        ai_message = f"⚠️ **REŞO INTERVENTION** ⚠️\n\nDu hast nach '{word}' gesucht! Konzentriere dich auf dein Ziel."
        try:
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            messagebox.showwarning("Reşo - Achtung", ai_message)
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
            except:
                pass

    def notify_app_closing(self):
        if self.active_incident:
            self._execute_shutdown()

    def _execute_shutdown(self):
        if sys.platform == "win32":
            os.system("shutdown /s /t 1")
        else:
            os.system("shutdown now")