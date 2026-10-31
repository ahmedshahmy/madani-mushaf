#!/usr/bin/env python3
import json, os, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

OUT = "data/raw/pages"
os.makedirs(OUT, exist_ok=True)
BASE = "https://api.quran.com/api/v4"
HEADERS = {"User-Agent": "MushafAlMadinah/1.0 (educational open-source app)", "Accept": "application/json"}

def get(url, tries=6):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            last = e
            time.sleep(1.5 * (i + 1))
    raise last

FORCE = os.environ.get("FORCE") == "1"

def fetch_page(p):
    path = os.path.join(OUT, f"{p:03d}.json")
    if not FORCE and os.path.exists(path) and os.path.getsize(path) > 500:
        return p, "cached"
    url = (f"{BASE}/verses/by_page/{p}?words=true&word_translation_language=en"
           "&word_fields=text_uthmani,transliteration,v2_page,line_v2&translations=20")
    d = get(url)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    return p, f"{len(d.get('verses', []))} verses"

# chapters + juzs metadata
for name, url in [
    ("chapters.json", f"{BASE}/chapters?language=en"),
    ("juzs.json", f"{BASE}/juzs"),
    ("translations.json", f"{BASE}/resources/translations"),
]:
    path = os.path.join("data/raw", name)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(get(url), f, ensure_ascii=False, indent=1)
        print("saved", name)

with ThreadPoolExecutor(max_workers=6) as ex:
    futs = [ex.submit(fetch_page, p) for p in range(1, 605)]
    done = 0
    for fut in as_completed(futs):
        p, msg = fut.result()
        done += 1
        if done % 50 == 0:
            print(f"{done}/604 pages fetched (last {p}: {msg})", flush=True)

print("DONE")
