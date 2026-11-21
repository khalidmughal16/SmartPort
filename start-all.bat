@echo off
rem Starts the backend (port 8000) and the frontend (port 3000) in two windows.
set ROOT=%~dp0
if exist "%ROOT%venv\Scripts\python.exe" ( set PY="%ROOT%venv\Scripts\python.exe" ) else if exist "%ROOT%backend\venv\Scripts\python.exe" ( set PY="%ROOT%backend\venv\Scripts\python.exe" ) else ( set PY=python )
start "SmartPort backend" cmd /k "cd /d %ROOT%backend && %PY% -m pip install -q -r requirements.txt && %PY% -m uvicorn app.main:app --reload"
start "SmartPort frontend" cmd /k "cd /d %ROOT%frontend && (if not exist node_modules npm install) && npm run dev"
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:3000
