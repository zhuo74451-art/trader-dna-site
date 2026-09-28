#!/bin/sh
set -eu
qa_port=4173
qa_session=tdna-authority-qa
qa_codex_dir=${CODEX_HOME:-"$HOME/.codex"}
qa_cli="$qa_codex_dir/skills/playwright/scripts/playwright_cli.sh"
mkdir -p qa/after qa/download
python3 -m http.server "$qa_port" --bind 127.0.0.1 >/tmp/trader-dna-authority-qa.log 2>&1 &
qa_server_pid=$!
trap 'kill "$qa_server_pid" 2>/dev/null || true; wait "$qa_server_pid" 2>/dev/null || true; bash "$qa_cli" -s="$qa_session" close >/dev/null 2>&1 || true' EXIT
bash "$qa_cli" -s="$qa_session" open "http://127.0.0.1:$qa_port/scan01-authority-preview.html"
bash "$qa_cli" -s="$qa_session" run-code --filename qa/capture-authority.js
bash "$qa_cli" -s="$qa_session" goto "http://127.0.0.1:$qa_port/qa/contact-sheet.html?phase=after&mode=desktop"
bash "$qa_cli" -s="$qa_session" resize 1440 900
bash "$qa_cli" -s="$qa_session" screenshot --filename=qa/hero-16-desktop-contact.png --full-page
bash "$qa_cli" -s="$qa_session" goto "http://127.0.0.1:$qa_port/qa/contact-sheet.html?phase=after&mode=mobile"
bash "$qa_cli" -s="$qa_session" screenshot --filename=qa/hero-16-mobile-contact.png --full-page
