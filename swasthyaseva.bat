@echo off
if "%1"=="" goto usage
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="health" goto health
goto usage

:usage
echo Usage: swasthyaseva ^<command^>
echo.
echo Commands:
echo   start   Start all dev servers
echo   stop    Stop all dev servers
echo   health  Check if all servers are responding
exit /b 1

:start
node %~dp0scripts\dev.js
exit /b

:stop
echo Stopping all servers...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000 " ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002 " ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3003 " ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4001 " ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
echo Done.
exit /b

:health
echo.
echo   SwasthyaSeva Health Check
echo   =========================
echo.
set ALL_OK=1
set UP_COUNT=0
set DOWN_COUNT=0
call :check "Backend " "http://localhost:5000/api/docs" 5000
call :check "Web     " "http://localhost:3000"          3000
call :check "Admin   " "http://localhost:3001"          3001
call :check "Doctor  " "http://localhost:3002"          3002
call :check "Clinic  " "http://localhost:3003"          3003
call :check "Flows   " "http://localhost:4001"          4001
echo.
echo   --------------------------
if "%ALL_OK%"=="1" (
    echo   Result: ALL %UP_COUNT% servers healthy
    exit /b 0
) else (
    echo   Result: %DOWN_COUNT% server^(s^) down, %UP_COUNT% up
    exit /b 1
)

:check
set STATUS=000
set LATENCY=0
for /f "tokens=1,2 delims= " %%a in ('curl -s -o nul -w "%%{http_code} %%{time_total}" --connect-timeout 3 %~2 2^>nul') do (
    set STATUS=%%a
    set LATENCY=%%b
)
if "%STATUS%"=="000" (
    echo   %~1  :%~3  DOWN   -- no response after %LATENCY%s
    set ALL_OK=0
    set /a DOWN_COUNT+=1
) else (
    echo   %~1  :%~3  UP     %STATUS%  %LATENCY%s
    set /a UP_COUNT+=1
)
goto :eof
