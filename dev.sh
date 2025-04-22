#!/bin/bash

set -e

PIDS=()

cleanup() {
    echo "Cleaning up background processes..."
    for pid in "${PIDS[@]}"; do
        if ps -p $pid > /dev/null; then
        echo "Killing process $pid"
        kill $pid
        fi
    done
    wait
}
trap cleanup EXIT


npm run dev:cms > dev_cms.log 2>&1 &
PIDS+=($!)

sleep 2

npm run dev:ogp > dev_ogp.log 2>&1 &
PIDS+=($!)

npm run next-dev:page
