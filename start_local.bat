@echo off
:: ===================================
:: Silver GYM - Start Local Server
:: يشغّل النظام محلياً
:: ===================================
title Silver GYM - Local Server

cd /d F:\gym\backend

echo.
echo  ================================
echo   SILVER GYM - Local Server
echo   http://localhost:8000
echo  ================================
echo.

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set LOCAL_IP=%%a
    goto :found
)
:found
set LOCAL_IP=%LOCAL_IP: =%
echo   Network access: http://%LOCAL_IP%:8000
echo.
echo   Press Ctrl+C to stop
echo  ================================
echo.

call venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
