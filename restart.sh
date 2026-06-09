#!/bin/bash
pkill -f uvicorn
sleep 1
cd /var/www/gym/backend
nohup venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 >> uvicorn.log 2>&1 &
echo "uvicorn started with PID $!"
