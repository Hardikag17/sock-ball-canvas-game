#!/usr/bin/env bash

target="$HOME/Desktop/dev/Geronimo/server-express/"
cp -f app.js $target
cd $target
git add .
git commit -m "auto update"
git push
echo "Done"
