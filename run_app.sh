#!/bin/bash

set -e

function menu() {
  clear
  echo "=============================================="
  echo "  Douyin Automation Suite - Launcher (Mac/Linux)"
  echo "=============================================="
  echo
  echo "  1) Extract channel data (paste channel URL)"
  echo "  2) Download images from notes (pick notes_links.txt)"
  echo "  3) Fetch downloadable video links (URL or videos_links.txt)"
  echo "  4) Download highest-quality videos (from batch folder)"
  echo "  5) Run setup (first-time only)"
  echo "  0) Exit"
  echo
  read -rp "Select an option [0-5]: " choice

  case "$choice" in
    1) extract ;; 
    2) images ;;
    3) fetchlinks ;;
    4) downloadvideos ;;
    5) setup ;;
    0) exit 0 ;;
    *) read -rp "Invalid choice. Press Enter to continue..." _ ; menu ;;
  esac
}

function extract() {
  clear
  read -rp "Paste the Douyin channel URL: " CHANNEL_URL
  [ -z "$CHANNEL_URL" ] && menu
  node fetch_video_links.js "$CHANNEL_URL"
  read -rp $'\nPress Enter to continue...' _
  menu
}

function images() {
  clear
  read -rp "Enter path to notes_links.txt: " NOTES_FILE
  [ -z "$NOTES_FILE" ] && menu
  node picture.js "$NOTES_FILE"
  read -rp $'\nPress Enter to continue...' _
  menu
}

function fetchlinks() {
  clear
  echo "Choose mode:"
  echo "  1) Single video URL"
  echo "  2) From file (videos_links.txt path)"
  read -rp "Select [1-2]: " sub
  case "$sub" in
    1)
      read -rp "Paste the Douyin video URL: " VIDEO_URL
      [ -z "$VIDEO_URL" ] && menu
      node fetch_downloadable_link.js "$VIDEO_URL"
      ;;
    2)
      read -rp "Enter path to videos_links.txt: " VIDEO_FILE
      [ -z "$VIDEO_FILE" ] && menu
      node fetch_downloadable_link.js --file "$VIDEO_FILE"
      ;;
    *) ;;
  esac
  read -rp $'\nPress Enter to continue...' _
  menu
}

function downloadvideos() {
  clear
  read -rp "Paste batch folder path (blank = auto-detect latest): " BATCH_DIR
  if [ -z "$BATCH_DIR" ]; then
    node download_videos.js
  else
    node download_videos.js --batch "$BATCH_DIR"
  fi
  read -rp $'\nPress Enter to continue...' _
  menu
}

function setup() {
  clear
  npm install
  node setup.js
  read -rp $'\nPress Enter to continue...' _
  menu
}

menu
