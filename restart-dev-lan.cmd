@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "WEB_PORT=3000"
set "WORKER_PORT=8787"
set "SPIKE_PORT=4176"

set "SCRIPT_DIR=%ROOT%\scripts"
set "WEB_DIR=%ROOT%\apps\web"
set "WORKER_DIR=%ROOT%\apps\worker"
set "SPIKE_DIR=%ROOT%\tmp\pob-browser-calcs-spike\browser-worker"

set "WORKER_PID_FILE=%ROOT%\.pob-codes-worker-lan.pid"
set "WEB_PID_FILE=%ROOT%\.pob-codes-web-lan.pid"
set "SPIKE_PID_FILE=%ROOT%\.pob-browser-worker-spike-lan.pid"

for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$candidate = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|192\\.168\\.)' -and $_.IPAddress -notlike '127.*' -and $_.InterfaceAlias -notmatch 'vEthernet|Loopback|VMware|VirtualBox|Bluetooth|Tailscale|Hamachi|ZeroTier' } | Sort-Object SkipAsSource, InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress; if (-not $candidate) { $candidate = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Sort-Object SkipAsSource, InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress }; if ($candidate) { $candidate }"`) do set "LAN_IP=%%I"

if not defined LAN_IP (
  echo Failed to detect a LAN IPv4 address for this machine.
  exit /b 1
)

set "WORKER_API_BASE=http://%LAN_IP%:%WORKER_PORT%"

if not exist "%SPIKE_DIR%\package.json" (
  echo Spike workspace not found: %SPIKE_DIR%
  exit /b 1
)

call :kill_pid_file "%WORKER_PID_FILE%"
call :kill_pid_file "%WEB_PID_FILE%"
call :kill_pid_file "%SPIKE_PID_FILE%"
call :kill_legacy_dev_windows
call :kill_port %WEB_PORT%
call :kill_port %WORKER_PORT%
call :kill_port %SPIKE_PORT%
call :wait_for_port_release %WEB_PORT%
call :wait_for_port_release %WORKER_PORT%
call :wait_for_port_release %SPIKE_PORT%

set "WORKER_COMMAND=npm.cmd run dev -- --ip 0.0.0.0 --port %WORKER_PORT%"
set "WEB_COMMAND=npm.cmd run dev -- --hostname 0.0.0.0 --port %WEB_PORT%"
set "SPIKE_COMMAND=npm.cmd run dev -- --host 0.0.0.0 --port %SPIKE_PORT%"

call :launch_window "PoB Codes Worker (LAN)" "%WORKER_PID_FILE%" "%WORKER_COMMAND%" "%WORKER_DIR%"
if errorlevel 1 exit /b 1

set "PORT=%WEB_PORT%"
set "NEXT_PUBLIC_API_BASE=%WORKER_API_BASE%"
set "POB_CODES_API_BASE=%WORKER_API_BASE%"
call :launch_window "PoB Codes Web (LAN)" "%WEB_PID_FILE%" "%WEB_COMMAND%" "%WEB_DIR%"
set "PORT="
set "NEXT_PUBLIC_API_BASE="
set "POB_CODES_API_BASE="
if errorlevel 1 exit /b 1
call :launch_window "PoB Browser Spike (LAN)" "%SPIKE_PID_FILE%" "%SPIKE_COMMAND%" "%SPIKE_DIR%"
if errorlevel 1 exit /b 1

echo Started worker, web, and browser-worker spike in separate windows.
echo.
echo Core app:  http://%LAN_IP%:%WEB_PORT%
echo Worker:    http://%LAN_IP%:%WORKER_PORT%
echo Spike:     http://%LAN_IP%:%SPIKE_PORT%
exit /b 0

:kill_pid_file
if not exist "%~1" exit /b 0
set /p TARGET_PID=<"%~1"
if not "%TARGET_PID%"=="" (
  taskkill /PID %TARGET_PID% /T /F >nul 2>nul
)
del /q "%~1" >nul 2>nul
exit /b 0

:kill_legacy_dev_windows
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\restart-dev-lan-cleanup.ps1" -Root "%ROOT%"
exit /b 0

:kill_port
for /f "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /r /c:":%~1 .*LISTENING"') do (
  taskkill /PID %%P /T /F >nul 2>nul
)
exit /b 0

:launch_window
set "WINDOW_TITLE=%~1"
set "PID_FILE=%~2"
set "RUN_COMMAND=%~3"
set "START_DIRECTORY=%~4"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\restart-dev-launch.ps1" -Root "%ROOT%" -WindowTitle "%WINDOW_TITLE%" -PidFile "%PID_FILE%" -RunCommand "%RUN_COMMAND%" -StartDirectory "%START_DIRECTORY%"
if errorlevel 1 goto :launch_window_failed
exit /b 0

:launch_window_failed
echo Failed to launch %WINDOW_TITLE%.
exit /b 1

:wait_for_port_release
set "PORT=%~1"
set /a ATTEMPTS=0

:wait_for_port_release_loop
netstat -ano -p tcp | findstr /r /c:":%PORT% .*LISTENING" >nul 2>nul
if errorlevel 1 exit /b 0

set /a ATTEMPTS+=1
if %ATTEMPTS% geq 20 (
  echo Timed out waiting for port %PORT% to close.
  exit /b 1
)

timeout /t 1 /nobreak >nul
goto :wait_for_port_release_loop
