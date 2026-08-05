@echo off
rem Rebuild JoshIEYI-judge.html from JoshIEYI.html + breadboard-sim
cd /d "%~dp0"
node build-integrated.js
echo.
pause
