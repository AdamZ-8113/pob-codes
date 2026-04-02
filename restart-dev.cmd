@echo off
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "WEB_PORT=3000"
set "WORKER_PORT=8787"
set "WORKER_API_BASE=http://localhost:%WORKER_PORT%"
set "WORKER_PID_FILE=%ROOT%\.pob-codes-worker.pid"
set "WEB_PID_FILE=%ROOT%\.pob-codes-web.pid"
set "SCRIPT_DIR=%ROOT%\scripts"

call :kill_pid_file "%WORKER_PID_FILE%"
call :kill_pid_file "%WEB_PID_FILE%"
call :kill_legacy_dev_windows
call :kill_port %WEB_PORT%
call :kill_port %WORKER_PORT%
call :wait_for_port_release %WEB_PORT%
call :wait_for_port_release %WORKER_PORT%

call :launch_window "PoB Codes Worker" "%WORKER_PID_FILE%" "set PORT=%WORKER_PORT% && npm.cmd run dev:worker"
if errorlevel 1 exit /b 1
call :launch_window "PoB Codes Web" "%WEB_PID_FILE%" "set PORT=%WEB_PORT% && set NEXT_PUBLIC_API_BASE=%WORKER_API_BASE% && set POB_CODES_API_BASE=%WORKER_API_BASE% && npm.cmd run dev:web"
if errorlevel 1 exit /b 1

echo Started worker and web servers in separate windows.
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
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\restart-dev-cleanup.ps1" -Root "%ROOT%"
exit /b 0

:kill_port
for /f "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /r /c:":%~1 .*LISTENING"') do (
  for /f "tokens=1" %%N in ('tasklist /fi "PID eq %%P" /fo csv /nh ^| findstr /i "node.exe"') do (
    taskkill /PID %%P /T /F >nul 2>nul
  )
)
exit /b 0

:launch_window
set "WINDOW_TITLE=%~1"
set "PID_FILE=%~2"
set "RUN_COMMAND=%~3"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\restart-dev-launch.ps1" -Root "%ROOT%" -WindowTitle "%WINDOW_TITLE%" -PidFile "%PID_FILE%" -RunCommand "%RUN_COMMAND%"
if errorlevel 1 (
  echo Failed to launch %WINDOW_TITLE%.
  exit /b 1
)
exit /b 0

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
