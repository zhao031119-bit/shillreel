#!/usr/bin/env bash
# Contact strips (6 frames, 640px high) from the sample MP4s: samples/frames/<sample>-strip.png
set -e
cd "$(dirname "$0")/../samples"
mkdir -p frames
for f in sample-*.mp4; do
  b=${f%.mp4}; args=(); i=0
  for ts in 1 3 5 7.5 9.3 11.2; do
    ffmpeg -v error -y -ss $ts -i "$f" -frames:v 1 -vf scale=-2:640 "/tmp/_s$i.png"; args+=(-i "/tmp/_s$i.png"); i=$((i+1))
  done
  ffmpeg -v error -y "${args[@]}" -filter_complex hstack=6 "frames/$b-strip.png"
done
