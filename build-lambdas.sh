#!/bin/zsh

# Navigate to the lambdas directory
cd lambdas

# Loop through each subfolder and run npm run build
for dir in */; do
  if [ -d "$dir" ]; then
    echo "Building $dir"
    cd "$dir"
    npm run build
    cd ..
  fi
done
