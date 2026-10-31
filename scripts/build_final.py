#!/usr/bin/env python3
"""Turn the intermediate morphology data into compact static JSON shards."""
import json, os, re, collections, shutil
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "public", "quran")
inter = json.load(open(os.path.join(ROOT, "data", "intermediate.json"), encoding="utf-8"))
words = inter["words"]
lemmas = inter["lemmas"]
roots = inter["roots"]
verse_translations = inter["verse_translations"]

chapters = json.load(open(os.path.join(RAW, "chapters.json")))["chapters"]
juzs = json.load(open(os.path.join(RAW, "juzs.json")))["juzs"]
pages_raw = {}
for p in range(1, 605):
    pages_raw[p] = json.load(open(os.path.join(RAW, "pages", f"{p:03d}.json"), encoding="utf-8"))

import sqlite3
qul = sqlite3.connect(os.path.join(RAW, "qul-layout.db"))
layout = collections.defaultdict(dict)
for p, line, typ, centered, fid, lid, surah in qul.execute(
        "select page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number from pages"):
    layout[p][line] = {"type": typ, "centered": bool(centered), "surah": surah}

# reset output data dir but keep fonts (public/fonts lives alongside)
for sub in ("pages", "roots", "occ"):
    shutil.rmtree(os.path.join(OUT, sub), ignore_errors=True)
    os.makedirs(os.path.join(OUT, sub), exist_ok=True)

# ---------------------------------------------------------------------------
# indexes
# ---------------------------------------------------------------------------
word_by_id = {w["id"]: w for w in words}
lemma_by_id = {l["id"]: l for l in lemmas}
roots_by_id = {r["id"]: r for r in roots}
verse_words = collections.defaultdict(list)
for w in words:
    verse_words[w["verse"]].append(w)
for vk in verse_words:
    verse_words[vk].sort(key=lambda w: w["w"])

# lemma forms / senses
lemma_forms = collections.defaultdict(collections.Counter)
for w in words:
    if w["lemma"] is not None and w["text"]:
        lemma_forms[w["lemma"]][w["text"]] += 1

root_lemmas = collections.defaultdict(list)
for l in lemmas:
    if l["root"] is not None:
        root_lemmas[l["root"]].append(l)

# ---------------------------------------------------------------------------
# compact word object
# ---------------------------------------------------------------------------
def compact_word(w):
    o = {"i": w["id"], "a": w["text"], "t": w["translation"], "p": w["pos"]}
    if w["translit"]:
        o["tr"] = w["translit"]
    if w["feats"]:
        o["f"] = w["feats"]
    if w["root"] is not None:
        o["r"] = w["root"]
    if w["lemma"] is not None:
        o["l"] = w["lemma"]
    segs = w["segments"]
    if len(segs) > 1 or (segs and segs[0][2] != "stem"):
        o["g"] = segs
    return o

# ---------------------------------------------------------------------------
# Quran-order index and first occurrences
# ---------------------------------------------------------------------------
def qkey(w):
    return (int(w["s"]), int(w["a"]), int(w["w"]))

word_order = sorted(words, key=qkey)
verse_page = {}
first_lemma = {}
first_root = {}
for w in word_order:
    verse_page.setdefault(w["verse"], w["page"])
    if w["lemma"] is not None:
        first_lemma.setdefault(w["lemma"], w)
    if w["root"] is not None:
        first_root.setdefault(w["root"], w)

for l in lemmas:
    fw = first_lemma.get(l["id"])
    if fw:
        l["first"] = fw["id"]
        l["page"] = fw["page"]
for r in roots:
    fw = first_root.get(r["id"])
    if fw:
        r["first"] = fw["id"]
        r["page"] = fw["page"]

# ---------------------------------------------------------------------------
# lexicon + meta
# ---------------------------------------------------------------------------
lex_lemmas = []
for l in lemmas:
    lex_lemmas.append([
        l["id"], l["ar"], l["plain"], l["pos"], l["type"], l["form"], l["root"],
        l["count"], l["gloss"], l["glosses"], l["first"], l["page"],
    ])
lex_roots = [[r["id"], r["ar"], r["bw"], r["tr"], r["count"], r["first"], r["page"]] for r in roots]
lexicon = {"lemmas": lex_lemmas, "roots": lex_roots}
with open(os.path.join(OUT, "lexicon.json"), "w", encoding="utf-8") as f:
    json.dump(lexicon, f, ensure_ascii=False, separators=(",", ":"))
print("lexicon", os.path.getsize(os.path.join(OUT, "lexicon.json")))

# juz start pages from words
juz_first_page = {}
verse_meta = {}
for p in range(1, 605):
    for v in pages_raw[p]["verses"]:
        verse_meta[v["verse_key"]] = v
for vk, v in verse_meta.items():
    j = v["juz_number"]
    pg = verse_page.get(vk, v.get("page_number"))
    if j not in juz_first_page or pg < juz_first_page[j]:
        juz_first_page[j] = pg

surah_bounds = {}
for w in words:
    sid = int(w["s"])
    p = w["page"]
    if sid not in surah_bounds:
        surah_bounds[sid] = [p, p]
    else:
        surah_bounds[sid][0] = min(surah_bounds[sid][0], p)
        surah_bounds[sid][1] = max(surah_bounds[sid][1], p)

chapters_meta = []
for c in chapters:
    bounds = surah_bounds.get(c["id"], [c["pages"][0], c["pages"][1]])
    chapters_meta.append({
        "id": c["id"],
        "name": c["name_simple"],
        "ar": c["name_arabic"],
        "en": c["translated_name"]["name"],
        "verses": c["verses_count"],
        "start": bounds[0],
        "end": bounds[1],
        "rev": c["revelation_place"],
    })
juz_meta = []
for j in sorted(juz_first_page):
    juz_meta.append({"id": j, "start": juz_first_page[j]})

basmala = " ".join(w["text"] for w in verse_words["1:1"])
meta = {
    "pageCount": 604,
    "wordCount": len(words),
    "verseCount": len(verse_words),
    "rootCount": len(roots),
    "lemmaCount": len(lemmas),
    "chapters": chapters_meta,
    "juzs": juz_meta,
    "basmala": basmala,
    "versePages": {k: v for k, v in sorted(verse_page.items())},
    "translation": "Saheeh International",
    "built": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
}
with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, separators=(",", ":"))
print("meta", os.path.getsize(os.path.join(OUT, "meta.json")))

# ---------------------------------------------------------------------------
# root detail files
# ---------------------------------------------------------------------------
root_senses = collections.defaultdict(collections.Counter)
for r in roots:
    senses = root_senses[r["id"]]
    for l in root_lemmas.get(r["id"], []):
        if l["count"] >= 2 and l["gloss"] and len(l["gloss"]) <= 32:
            g = re.sub(r"^(And|Then|So) ", "", l["gloss"]).strip()
            if g:
                senses[g] += l["count"]
    if not senses:
        for l in sorted(root_lemmas.get(r["id"], []), key=lambda x: -x["count"])[:3]:
            if l["gloss"]:
                senses[re.sub(r"^(And|Then|So) ", "", l["gloss"]).strip()] += l["count"]

for r in roots:
    rid = r["id"]
    items = []
    for l in sorted(root_lemmas.get(rid, []), key=lambda x: (-x["count"], x["id"])):
        forms = [[k, v] for k, v in lemma_forms[l["id"]].most_common(6)]
        items.append([
            l["id"], l["ar"], l["plain"], l["type"], l["form"], l["count"],
            l["gloss"], l["glosses"], forms, l["first"], l["page"],
        ])
    senses = [s for s, _ in root_senses[rid].most_common(6)]
    out = {
        "id": rid,
        "ar": r["ar"],
        "bw": r["bw"],
        "tr": r["tr"],
        "count": r["count"],
        "lemmas": items,
        "senses": senses,
    }
    with open(os.path.join(OUT, "roots", f"{rid}.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

print("roots written")

# ---------------------------------------------------------------------------
# occurrence files
# ---------------------------------------------------------------------------
def context(w):
    vw = verse_words[w["verse"]]
    try:
        i = next(k for k, x in enumerate(vw) if x["id"] == w["id"])
    except StopIteration:
        return "", ""
    before = " ".join(x["text"] for x in vw[max(0, i - 3):i])
    after = " ".join(x["text"] for x in vw[i + 1:i + 4])
    return before, after

occ_cache = {}
def occ_entry(w):
    before, after = context(w)
    return [w["id"], w["page"], w["text"], w["translation"], before, after, w["lemma"]]

# root occurrences
by_root = collections.defaultdict(list)
for w in words:
    if w["root"] is not None:
        by_root[w["root"]].append(w)
for rid, ws in by_root.items():
    ws = sorted(ws, key=qkey)
    data = [occ_entry(w) for w in ws]
    with open(os.path.join(OUT, "occ", f"root-{rid}.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

# rootless lemma occurrences
by_rootless_lemma = collections.defaultdict(list)
for w in words:
    if w["root"] is None and w["lemma"] is not None:
        by_rootless_lemma[w["lemma"]].append(w)
for lid, ws in by_rootless_lemma.items():
    ws = sorted(ws, key=qkey)
    data = [occ_entry(w) for w in ws]
    with open(os.path.join(OUT, "occ", f"lemma-{lid}.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

print("occurrences written", len(by_root), len(by_rootless_lemma))

# ---------------------------------------------------------------------------
# page files
# ---------------------------------------------------------------------------
def arabic_digits(n):
    return str(n).translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))

verse_max = {}
for w in words:
    verse_max[w["verse"]] = max(verse_max.get(w["verse"], 0), int(w["w"]))

# Group every word by its explicit QPC2 page / line.
page_items = collections.defaultdict(lambda: collections.defaultdict(list))
for w in words:
    page_items[w["page"]][w["line"]].append(w)

# Verses present on each page, in mushaf order.
page_verses = collections.defaultdict(list)
for w in word_order:
    if not page_verses[w["page"]] or page_verses[w["page"]][-1] != w["verse"]:
        if w["verse"] not in page_verses[w["page"]]:
            page_verses[w["page"]].append(w["verse"])

used_words = 0
page_sizes = 0
for p in range(1, 605):
    lines = []
    for line_no in sorted(layout[p]):
        info = layout[p][line_no]
        if info["type"] == "surah_name":
            lines.append({"l": line_no, "t": "s", "s": info["surah"]})
        elif info["type"] == "basmallah":
            lines.append({"l": line_no, "t": "b"})
        else:
            ws = sorted(page_items[p].get(line_no, []), key=qkey)
            items = []
            for w in ws:
                items.append(compact_word(w))
                if int(w["w"]) == verse_max[w["verse"]]:
                    items.append({"e": arabic_digits(int(w["a"])), "v": w["verse"]})
                used_words += 1
            lines.append({"l": line_no, "t": "a", "c": 1 if info["centered"] else 0, "w": items})

    vlist = []
    for vk in page_verses.get(p, []):
        vm = verse_meta.get(vk, {})
        vlist.append({
            "k": vk,
            "t": verse_translations.get(vk, ""),
            "j": vm.get("juz_number"),
            "h": vm.get("hizb_number"),
            "s": int(vk.split(":")[0]),
            "a": int(vk.split(":")[1]),
            "sd": vm.get("sajdah_number"),
        })
    first_vm = vlist[0] if vlist else {}
    surahs = sorted({x["s"] for x in vlist})
    page = {
        "p": p,
        "lines": lines,
        "verses": vlist,
        "juz": first_vm.get("j"),
        "hizb": first_vm.get("h"),
        "surahs": surahs,
        "sajdah": any(x.get("sd") for x in vlist),
    }
    path = os.path.join(OUT, "pages", f"{p:03d}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(page, f, ensure_ascii=False, separators=(",", ":"))
    page_sizes += os.path.getsize(path)

print("words placed in pages:", used_words)
print("pages written; total bytes", page_sizes)

# sizes
def dir_size(path):
    return sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(path) for f in fs)
for sub in ("pages", "roots", "occ"):
    print(sub, dir_size(os.path.join(OUT, sub)))
print("total", dir_size(OUT))
