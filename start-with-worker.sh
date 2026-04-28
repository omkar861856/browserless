#!/bin/bash

echo "Starting browserless..."
# Run browserless start script in the background
/app/scripts/start.sh &
BROWSERLESS_PID=$!

echo "Waiting for browserless to initialize..."
sleep 10

echo "Starting YouTube cookie worker..."
# Run the worker script in the background
node /app/youtube-cookie-worker.js &
WORKER_PID=$!

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
