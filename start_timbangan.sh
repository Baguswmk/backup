#!/bin/bash

# Define variables
PORT=5959
BUILD_DIR=dist

# Build the Vue.js project
echo "Building the Vue.js project..."
npm run build

# Start the http-server with pm2
echo "Starting http-server with pm2..."
pm2 start `which http-server` --name "btrace-client" --node-args="--initial-heap-size=1024 --max-old-space-size=2048" --watch --max-memory-restart 250M -- -p $PORT $BUILD_DIR

# Save pm2 process list
pm2 save

# Show pm2 process list
pm2 list

