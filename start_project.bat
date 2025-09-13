@echo off
echo 🚀 Starting DXA Translator App...

:: تشغيل الباك إند
start cmd /k "cd backend && npm install && npm start"

:: تشغيل الفرونت إند
start cmd /k "cd frontend && npx serve ."

echo.
echo ✅ Backend running on http://localhost:5000
echo ✅ Frontend running on http://localhost:3000
echo.
pause