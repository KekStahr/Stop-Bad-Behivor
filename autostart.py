import sys

def setup_autostart(enable=True):
    if sys.platform != "win32":
        return
    import winreg
    key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
    app_name = "ResoApp"
    executable_path = sys.executable

    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_ALL_ACCESS)
        if enable:
            winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, f'"{executable_path}"')
        else:
            try:
                winreg.DeleteValue(key, app_name)
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
    except Exception as e:
        print(f"Autostart-Fehler: {e}")