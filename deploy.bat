@echo off
echo.
echo  Deploying InternX to GitHub...
echo.

cd /d "%~dp0"

git add index.html app.js styles.css mockData.js robot_avatar.png robot_avatar.webp signature.png upi_payment_qr_code.png
git add models/

set /p msg="Enter commit message (e.g. 'fixed button bug'): "
if "%msg%"=="" set msg=update

git commit -m "%msg%"
git push origin main

echo.
echo  Done! Live at: https://djutkarshoffical-prog.github.io/internx-portal/
echo.
pause
