#!/bin/bash

mkdir -p release/app
cp -r ../compiled/source-node/. ./release/app
docker login

echo "Building for platform linux/amd64"

cd base
docker buildx build --platform linux/amd64 --push -t zenesisuk/zx-puppeteer-server-base .
cd ..

cd release
docker buildx build --platform linux/amd64 --push -t zenesisuk/zx-puppeteer-server .
cd ..

