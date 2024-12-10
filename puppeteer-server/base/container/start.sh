#!/bin/bash

set -x

echo "Starting..."
pwd

echo "Auto restart: $ZX_AUTO_RESTART"

function __run_puppeteer() {
  # Make sure there is no artifact left over
  rm -f ./.shutdown-docker

  # Add hooks
  . ./pre-start-hook.sh 2>&1 | tee -a ./console.log

  # Run the web server; this shouldnt crash, but if it does, we restart it
  node $ZX_NODE_INSPECT ./app/puppeteer-server/index.js launch 2>&1 | tee -a ./console.log
  if [ -f ./.shutdown-docker ] ; then
    echo "Shutdown detected" >> ./console.log
    exit 0
  fi
}

function __run_worker() {
  PUPPETEER_SKIP_DOWNLOAD=true npm install --frozen-lockfile
  node $ZX_NODE_ARGS 2>&1 | tee -a ./console.log
}

while true ; do
  if [[ "$ZX_MODE" == "puppeteer" ]] ; then
    __run_puppeteer
  elif [[ "$ZX_MODE" == "worker" ]] ; then
    __run_worker
  else
    echo "Unknown mode: $ZX_MODE"
    exit 1
  fi

  if [[ "$ZX_AUTO_RESTART" != "true" ]] ; then
    break
  else
    sleep 2
  fi
done

