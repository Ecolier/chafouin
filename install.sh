#!/bin/sh

cd chafouin-shared
npm install
npm run build

cd ../chafouin-api
npm install
npm run build

cd ../chafouin-telegram
npm install
npm run build

echo $1 >> .env

cd ..