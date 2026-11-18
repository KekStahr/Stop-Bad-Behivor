@echo off
rem Removes Life: finds the installed copy in the Windows uninstall list and starts its own uninstaller.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$keys = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'; $app = Get-ItemProperty $keys -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Life*Re*o*' } | Select-Object -First 1; if (-not $app) { Write-Host 'Life ist nicht installiert.'; exit 1 }; Write-Host ('Deinstalliere ' + $app.DisplayName + ' ...'); $exe = ($app.UninstallString -replace '^\"([^\"]+)\".*$','$1'); Start-Process -FilePath $exe -Wait"
pause
