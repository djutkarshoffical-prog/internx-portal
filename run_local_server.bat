@echo off
title InternX Local Server
echo Starting local web server for InternX...
powershell -NoProfile -ExecutionPolicy Bypass -File start_server.ps1
pause
