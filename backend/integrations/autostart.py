import os
import subprocess
import sys


APP_NAME = "ResoApp"
RUN_KEY_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"


def _get_autostart_command():
    if getattr(sys, "frozen", False):
        command = [sys.executable, "--hidden"]
    else:
        command = [sys.executable, os.path.abspath(sys.argv[0]), "--hidden"]
    return subprocess.list2cmdline(command)


def is_autostart_enabled():
    if sys.platform != "win32":
        return False

    import winreg

    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER, RUN_KEY_PATH, 0, winreg.KEY_QUERY_VALUE
        ) as key:
            value, _ = winreg.QueryValueEx(key, APP_NAME)
            return bool(value)
    except FileNotFoundError:
        return False
    except OSError as error:
        print(f"Autostart-Fehler: {error}")
        return False


def setup_autostart(enable=True):
    if sys.platform != "win32":
        return False

    import winreg

    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER, RUN_KEY_PATH, 0, winreg.KEY_SET_VALUE
        ) as key:
            if enable:
                winreg.SetValueEx(
                    key, APP_NAME, 0, winreg.REG_SZ, _get_autostart_command()
                )
            else:
                try:
                    winreg.DeleteValue(key, APP_NAME)
                except FileNotFoundError:
                    pass
        return True
    except OSError as error:
        print(f"Autostart-Fehler: {error}")
        return False