#!/usr/bin/env python3
"""Sanity-check the generated public/quran bundle."""
import glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QURAN = os.path.join(ROOT, "public", "quran")
errors = []

meta = json.load(open(os.path.join(QURAN, "meta.json"), encoding="utf-8"))
lex = json.load(open(os.path.join(QURAN, "lexicon.json"), encoding="utf-8"))
lemmas = {x[0]: x for x in lex["lemmas"]}
roots = {x[0]: x for x in lex["roots"]}

files = sorted(glob.glob(os.path.join(QURAN, "pages", "*.json")))
if len(files) != 604:
    errors.append(f"expected 604 page files, found {len(files)}")

word_ids = set()
verse_keys = set()
for path in files:
    page = json.load(open(path, encoding="utf-8"))
    for line in page["lines"]:
        if line["t"] == "a":
            for item in line.get("w", []):
                if "i" in item:
                    if item["i"] in word_ids:
                        errors.append(f"duplicate word {item['i']}")
                    word_ids.add(item["i"])
                    if item.get("l") is not None and item["l"] not in lemmas:
                        errors.append(f"unknown lemma {item['l']} in {item['i']}")
                    if item.get("r") is not None and item["r"] not in roots:
                        errors.append(f"unknown root {item['r']} in {item['i']}")
    for v in page["verses"]:
        verse_keys.add(v["k"])

occ_files = glob.glob(os.path.join(QURAN, "occ", "*.json"))
occ_count = sum(len(json.load(open(p, encoding="utf-8"))) for p in occ_files)

checks = {
    "pages": (len(files), 604),
    "words": (len(word_ids), meta["wordCount"]),
    "verses": (len(verse_keys), meta["verseCount"]),
    "lemmas": (len(lemmas), meta["lemmaCount"]),
    "roots": (len(roots), meta["rootCount"]),
    "occurrences": (occ_count, meta["wordCount"]),
}
for name, (got, want) in checks.items():
    if got != want:
        errors.append(f"{name}: {got} != {want}")

if len(roots) != 1642:
    errors.append(f"unexpected root count {len(roots)}")

print("Mushaf bundle:", json.dumps({k: v[0] for k, v in checks.items()}))
if errors:
    print("\n".join(f"ERROR: {e}" for e in errors[:30]))
    sys.exit(1)
print("OK")
