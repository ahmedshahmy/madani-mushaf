#!/usr/bin/env bash
# Fetch the upstream datasets used to build public/quran.
# The Quran.com pages are fetched by fetch_pages.py; this script downloads the
# morphology corpus and the 15-line Madani layout database.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p data/raw

if [ ! -s data/raw/quranic-corpus-morphology-0.4.txt ]; then
  echo "Downloading Quranic Arabic Corpus morphology (v0.4)…"
  curl -fL --retry 3 \
    "https://raw.githubusercontent.com/cltk/arabic_morphology_quranic-corpus/master/quranic-corpus-morphology-0.4.txt" \
    -o data/raw/quranic-corpus-morphology-0.4.txt
fi

if [ ! -s data/raw/qul-layout.db ]; then
  echo "Downloading QUL 15-line Madani layout…"
  tmp="$(mktemp -d)"
  curl -fL --retry 3 \
    "https://raw.githubusercontent.com/blueheron786/quranic-universal-library-mushaf-layouts/main/qpc-v2-15-lines.db.zip" \
    -o "$tmp/qul.zip"
  unzip -p "$tmp/qul.zip" qpc-v2-15-lines.db > data/raw/qul-layout.db
  rm -rf "$tmp"
fi

echo "Fetching the 604 Quran.com pages and chapter metadata…"
python3 scripts/fetch_pages.py
echo "Sources ready. Run: npm run data"
