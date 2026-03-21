#!/bin/bash

echo "Starting backend..."
cd apps/services
python -m venv .
source ./bin/activate
pip install -r requirements.txt &
uvicorn apps/services/main:app --reload &

echo "Starting frontend..."
cd apps/frontend  
npm install &
npm run build &
npm run start