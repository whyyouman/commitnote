#!/bin/bash

echo "Starting backend..."
cd apps/api
python -m venv .
source venv/bin/activate
pip install -r requirements.txt &
uvicorn main:app --reload &

echo "Starting frontend..."
cd ../web
npm install &
npm run build &
npm run start