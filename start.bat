@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Pehli baar: packages install ho rahe hain, thora intezar karein...
  call npm install
)
start "" http://localhost:3000
call npm start
pause
