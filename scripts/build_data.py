#!/usr/bin/env python3
"""
Build the static Qur'an data bundle for the Madani Mushaf word-by-word app.

Sources
-------
- Quran.com API v4: Uthmani words, line/verse placement, word-by-word
  English glosses and transliterations, Saheeh International verse translation.
- Quranic Arabic Corpus v0.4 (GPL): morphology, lemmas, roots, grammatical
  features for every word.
- Quranic Universal Library (QUL) 15-line Madani layout: line types
  (surah name / basmala / ayah) for the 604-page mushaf.

The morphology and translation annotations are not modified in substance;
they are reorganised into compact JSON for this reader.
"""
import json, os, re, sqlite3, html, unicodedata, collections, shutil
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "public", "quran")

# ---------------------------------------------------------------------------
# Buckwalter -> Arabic
# ---------------------------------------------------------------------------
BW = {
    " ": " ", "'": "ء", "|": "آ", ">": "أ", "&": "ؤ", "<": "إ", "}": "ئ",
    "A": "ا", "b": "ب", "p": "ة", "t": "ت", "v": "ث", "j": "ج", "H": "ح",
    "x": "خ", "d": "د", "*": "ذ", "r": "ر", "z": "ز", "s": "س", "$": "ش",
    "S": "ص", "D": "ض", "T": "ط", "Z": "ظ", "E": "ع", "g": "غ", "_": "ـ",
    "f": "ف", "q": "ق", "k": "ك", "l": "ل", "m": "م", "n": "ن", "h": "ه",
    "w": "و", "Y": "ى", "y": "ي", "F": "ً", "N": "ٌ", "K": "ٍ", "a": "َ",
    "u": "ُ", "i": "ِ", "~": "ّ", "o": "ْ", "`": "ٰ", "{": "ٱ",
    # Quranic-corpus orthographic extras (marks / variants that are not
    # needed for a readable label).  They are stripped from display labels.
    "^": "", "@": "ٰ", "[": "", "]": "", "#": "", ":": "", ";": "",
    '"': "", "-": "", "+": "", "!": "", "%": "", ",": "", ".": "",
}
MARKS = set(range(0x064B, 0x0660)) | {0x0670, 0x0640, 0x06DD, 0x06DE, 0x06E5,
        0x06E6, 0x08F0, 0x08F1, 0x08F2} | set(range(0x06D6, 0x06EE))
ARABIC_LETTER = re.compile(r"[\u0621-\u064A\u0671]")

def bw_to_ar(s: str) -> str:
    return "".join(BW.get(c, c) for c in s)

def strip_marks(s: str) -> str:
    return "".join(c for c in s if ord(c) not in MARKS and c != "ـ")

def norm_ar(s: str) -> str:
    """Normalise Arabic for matching / exact-form grouping."""
    s = unicodedata.normalize("NFC", s)
    s = s.replace("\u0670", "ا")
    out = []
    for c in s:
        if ord(c) in MARKS:
            continue
        if c in "آأإٱ":
            c = "ا"
        elif c == "ى":
            c = "ي"
        elif c == "ة":
            c = "ه"
        elif c == "ؤ":
            c = "و"
        elif c == "ئ":
            c = "ي"
        elif c in "ءـ":
            continue
        if "\u0621" <= c <= "\u064A" or ord(c) == 0x0671:
            out.append(c)
    return "".join(out)

def clean_label(s: str) -> str:
    """Buckwalter lemma -> readable, undiacritised Arabic label."""
    ar = bw_to_ar(s).replace("\u0670", "ا")
    ar = strip_marks(ar)
    ar = "".join(c for c in ar if ARABIC_LETTER.match(c) or c == " ")
    # medial alef-maqsura in the corpus often stands for a long alif
    chars = list(ar)
    for i, c in enumerate(chars):
        if c == "ى" and i < len(chars) - 1:
            chars[i] = "ا"
    ar = "".join(chars)
    ar = ar.replace("ٱ", "ا").replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    return ar.strip()

def root_label(s: str) -> str:
    ar = clean_label(s)
    return ar

def clean_text(s):
    if not s:
        return ""
    s = re.sub(r"<sup[^>]*>.*?</sup>", "", s, flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def clean_gloss(s):
    s = clean_text(s)
    s = s.strip(" .")
    return s

# ---------------------------------------------------------------------------
# Load source data
# ---------------------------------------------------------------------------
chapters = json.load(open(os.path.join(RAW, "chapters.json")))["chapters"]
juzs = json.load(open(os.path.join(RAW, "juzs.json")))["juzs"]

# morphology: (s,a,w) -> list of segments in order
segments = collections.defaultdict(list)
for line in open(os.path.join(RAW, "quranic-corpus-morphology-0.4.txt"), encoding="utf-8"):
    if line.startswith("#") or not line.strip():
        continue
    parts = line.rstrip("\n").split("\t")
    if len(parts) < 4:
        continue
    m = re.match(r"\((\d+):(\d+):(\d+):(\d+)\)", parts[0])
    if not m:
        continue
    s, a, w, idx = map(int, m.groups())
    segments[(s, a, w)].append({
        "idx": idx,
        "form": parts[1],
        "tag": parts[2],
        "raw": parts[3],
    })

# pages (the API returns each word exactly once across the 604 page requests;
# line_number is relative to the requested page)
pages = {}
verse_meta = {}
for p in range(1, 605):
    d = json.load(open(os.path.join(RAW, "pages", f"{p:03d}.json"), encoding="utf-8"))
    pages[p] = d
    for v in d["verses"]:
        verse_meta[v["verse_key"]] = v

# QUL layout line types
qul = sqlite3.connect(os.path.join(RAW, "qul-layout.db"))
layout = collections.defaultdict(dict)
for p, line, typ, centered, fid, lid, surah in qul.execute(
        "select page_number, line_number, line_type, is_centered, first_word_id, last_word_id, surah_number from pages"):
    layout[p][line] = {"type": typ, "centered": bool(centered), "surah": surah}

# ---------------------------------------------------------------------------
# Build the word universe
# ---------------------------------------------------------------------------
words = []          # ordered by page, verse, position
word_by_id = {}
page_words = collections.defaultdict(list)   # page -> list of words (with line)
verse_words = collections.defaultdict(list)  # verse key -> list of words
verse_translations = {}

for p in range(1, 605):
    d = pages[p]
    # Keep the API's verse order (mushaf order). Each verse is wholly on a page.
    for v in d["verses"]:
        vk = v["verse_key"]
        if vk not in verse_translations and v.get("translations"):
            tr = next((x for x in v["translations"] if x.get("resource_id") == 20), v["translations"][0])
            verse_translations[vk] = clean_text(tr.get("text", ""))
        for w in v["words"]:
            if w.get("char_type_name") != "word":
                continue
            wid = f"{vk}:{w['position']}"
            if wid in word_by_id:
                continue
            entry = {
                "id": wid,
                "s": v["verse_number"] and v["verse_key"].split(":")[0],
                "a": v["verse_key"].split(":")[1],
                "w": w["position"],
                "text": w["text_uthmani"],
                "translation": clean_gloss((w.get("translation") or {}).get("text", "")),
                "translit": (w.get("transliteration") or {}).get("text") or "",
                "line": w.get("line_v2") or w["line_number"],
                "page": w.get("v2_page") or p,
                "verse": vk,
                "verse_translation": verse_translations.get(vk, ""),
            }
            words.append(entry)
            word_by_id[wid] = entry
            page_words[p].append(entry)
            verse_words[vk].append(entry)

print(f"words: {len(words)}  verses: {len(verse_words)}  pages: {len(page_words)}")

# ---------------------------------------------------------------------------
# Morphology parsing
# ---------------------------------------------------------------------------
ROOT_RE = re.compile(r"ROOT:([^|]+)")
LEM_RE = re.compile(r"LEM:([^|]+)")
SP_RE = re.compile(r"SP:([^|]+)")

def parse_segment(seg):
    raw = seg["raw"]
    parts = raw.split("|")
    role = "stem"
    if "PREFIX" in parts:
        role = "prefix"
    elif "SUFFIX" in parts:
        role = "suffix"
    feats = []
    root_bw = None
    lem_bw = None
    sp = None
    for x in parts:
        if x in ("PREFIX", "SUFFIX", "STEM"):
            continue
        if x.startswith("POS:"):
            continue
        if x.startswith("ROOT:"):
            root_bw = x[5:]
            continue
        if x.startswith("LEM:"):
            lem_bw = x[4:]
            continue
        if x.startswith("SP:"):
            sp = x[3:]
            continue
        feats.append(x.rstrip("+"))
    if role == "prefix":
        # keep the prefix code, e.g. w:CONJ, Al, bi, l:P
        code = next((x.rstrip("+") for x in parts if x not in ("PREFIX", "STEM", "SUFFIX")
                     and not x.startswith(("POS:", "LEM:", "ROOT:", "SP:"))), "")
        feats = [code] if code else []
    return {
        "text_bw": seg["form"],
        "pos": seg["tag"],
        "role": role,
        "feats": feats,
        "root": root_bw,
        "lemma": lem_bw,
        "sp": sp,
    }

def derive_type(pos, feats):
    fset = set(feats)
    if pos == "V":
        form = next((f[1:-1] for f in feats if re.fullmatch(r"\((I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\)", f)), "I")
        return f"Verb · Form {form}", form
    if pos in ("N", "ADJ"):
        if "ACT" in fset and "PCPL" in fset:
            return "Active participle", None
        if "PASS" in fset and "PCPL" in fset:
            return "Passive participle", None
        if "VN" in fset:
            return "Verbal noun", None
        return ("Noun" if pos == "N" else "Adjective"), None
    label = {
        "PN": "Proper noun", "PRON": "Pronoun", "DEM": "Demonstrative",
        "REL": "Relative pronoun", "P": "Preposition", "CONJ": "Conjunction",
        "DET": "Definite article", "NEG": "Negation", "ACC": "Accusative particle",
        "COND": "Conditional particle", "INTG": "Interrogative", "VOC": "Vocative",
        "T": "Time adverb", "LOC": "Location adverb", "SUB": "Subordinating conjunction",
        "EMPH": "Emphatic particle", "INL": "Quranic initials", "FUT": "Future particle",
        "REM": "Resumption particle", "CERT": "Particle of certainty",
        "RES": "Restriction particle", "RSLT": "Result particle", "SUP": "Supplemental particle",
        "CIRC": "Circumstantial particle", "COM": "Comitative particle",
        "CAUS": "Particle of cause", "EXL": "Explanation particle", "EXP": "Exceptive particle",
        "PREV": "Preventive particle", "PRO": "Prohibition particle", "RET": "Retraction particle",
        "SUR": "Surprise particle", "AMD": "Amendment particle", "ANS": "Answer particle",
        "AVR": "Aversion particle", "EQ": "Equalization particle", "EXH": "Exhortation particle",
        "INC": "Inceptive particle", "INT": "Particle of interpretation", "IMPN": "Imperative verbal noun",
        "PRP": "Purpose lām", "IMPV": "Imperative lām",
    }.get(pos, pos or "Particle")
    return label, None

def segment_display_text(word_text, parsed):
    """Return the substring of the Uthmani word for each segment when possible."""
    nw = norm_ar(word_text)
    # map normalised index -> original index
    idx = []
    oi = 0
    for c in word_text:
        if ord(c) in MARKS or c == "ـ":
            oi += 1
            continue
        nc = c
        if nc in "آأإٱ":
            nc = "ا"
        elif nc == "ى":
            nc = "ي"
        elif nc == "ة":
            nc = "ه"
        elif nc == "ؤ":
            nc = "و"
        elif nc == "ئ":
            nc = "ي"
        elif nc == "ء":
            oi += 1
            continue
        if "\u0621" <= nc <= "\u064A" or ord(nc) == 0x0671:
            idx.append(oi)
        oi += 1
    if len(idx) != len(nw):
        idx = list(range(len(nw)))
    out = []
    cur = 0
    for seg in parsed:
        ns = norm_ar(bw_to_ar(seg["text_bw"])) if seg["role"] != "stem" else norm_ar(bw_to_ar(seg["text_bw"]))
        if not ns:
            out.append("")
            continue
        if seg["role"] == "suffix":
            j = nw.rfind(ns)
        else:
            j = nw.find(ns, cur)
            if j < 0:
                j = nw.rfind(ns)
        if j < 0 or not idx:
            out.append("")
            continue
        st = idx[min(j, len(idx) - 1)]
        en_i = min(j + len(ns) - 1, len(idx) - 1)
        en = idx[en_i] + 1
        while en < len(word_text) and (ord(word_text[en]) in MARKS or word_text[en] == "ـ"):
            en += 1
        out.append(word_text[st:en])
        cur = max(cur, j + len(ns))
    return out

# ---------------------------------------------------------------------------
# First pass: parse morphology for every word, assign roots/lemmas
# ---------------------------------------------------------------------------
root_counts = collections.Counter()
lemma_counts = collections.Counter()
synth_lemmas = {}

SPECIAL_RE = re.compile(r"[^\u0621-\u064A\u0671\u064B-\u065F\u0670\u06D6-\u06ED\u0640]")

def display_arabic(bw: str) -> str:
    ar = bw_to_ar(bw).replace("ـ", "")
    ar = "".join(c for c in ar if ARABIC_LETTER.match(c) or ord(c) in MARKS)
    return ar.strip() or bw_to_ar(bw).strip()

for w in words:
    key = tuple(map(int, w["id"].split(":")))
    parsed = [parse_segment(s) for s in sorted(segments[key], key=lambda x: x["idx"])]
    w["_segments"] = parsed
    stems = [s for s in parsed if s["role"] == "stem"]
    head = stems[0] if stems else (parsed[0] if parsed else None)
    content = next((s for s in stems if s["root"]), None) or next((s for s in stems if s["lemma"]), None) or head
    w["_head"] = head
    w["_content"] = content
    root_bw = content["root"] if content and content["root"] else (head["root"] if head else None)
    if not root_bw:
        root_bw = next((s["root"] for s in parsed if s["root"]), None)
    lemma_bw = content["lemma"] if content and content["lemma"] else None
    if not lemma_bw:
        # The corpus does not assign a lemma to detached pronouns or the
        # disconnected letters. Synthesize a stable lemma so these words still
        # have a dictionary entry, a full occurrence list and a search record.
        stem = content or head
        stem_bw = stem["text_bw"] if stem else w["text"]
        plain = clean_label(stem_bw) or clean_label(w["text"]) or norm_ar(w["text"])
        pos = (head["pos"] if head else "") or ""
        if pos == "PRON":
            key = "~pron:" + plain
        elif pos == "INL":
            key = "~inl:" + plain
        else:
            key = "~word:" + plain
        if not plain:
            key = "~word:" + norm_ar(w["text"])
        lemma_bw = key
        if key not in synth_lemmas:
            typ, _ = derive_type(pos, head["feats"] if head else [])
            synth_lemmas[key] = {
                "ar": display_arabic(stem_bw) if stem else w["text"],
                "plain": plain or norm_ar(w["text"]),
                "pos": pos,
                "type": typ,
            }
    w["_root_bw"] = root_bw
    w["_lemma_bw"] = lemma_bw
    if root_bw:
        root_counts[root_bw] += 1
    if lemma_bw:
        lemma_counts[lemma_bw] += 1

# IDs sorted by frequency then key for determinism
root_ids = {k: i for i, (k, _) in enumerate(sorted(root_counts.items(), key=lambda kv: (-kv[1], kv[0])))}
lemma_ids = {k: i for i, (k, _) in enumerate(sorted(lemma_counts.items(), key=lambda kv: (-kv[1], kv[0])))}

print(f"roots: {len(root_ids)}  lemmas: {len(lemma_ids)}")

# ---------------------------------------------------------------------------
# Second pass: segment text, feature compaction, per-lemma stats
# ---------------------------------------------------------------------------
lemma_surfaces = collections.defaultdict(collections.Counter)
lemma_glosses = collections.defaultdict(collections.Counter)
lemma_pos = collections.defaultdict(collections.Counter)
lemma_roots = collections.defaultdict(collections.Counter)
lemma_types = collections.defaultdict(collections.Counter)
lemma_verb_form = collections.defaultdict(collections.Counter)
lemma_first = {}
root_first = {}
root_glosses = collections.defaultdict(collections.Counter)

def citation_clean(surface):
    """Drop a final case ending / tanwin for a dictionary-style label."""
    s = surface.strip()
    if not s:
        return s
    # accusative tanwin is written as tanwin + alif, e.g. كِتَٰبًۭا.
    # Remove the final alif only when the marks just before it include tanwin.
    if s.endswith("ا"):
        j = len(s) - 2
        marks_found = []
        while j >= 0 and ord(s[j]) in MARKS:
            marks_found.append(s[j])
            j -= 1
        if any(m in "ًٌٍ" for m in marks_found):
            s = s[:j + 1]
    s = s.rstrip("".join(chr(c) for c in MARKS))
    return s.replace("ـ", "")

def verb_citation(surface):
    return surface.replace("ـ", "")

for w in words:
    parsed = w["_segments"]
    texts = segment_display_text(w["text"], parsed)
    # fallback: if one stem and no affixes, use the whole word
    if len(parsed) == 1 and parsed[0]["role"] == "stem":
        texts = [w["text"]]
    segs_json = []
    for seg, txt in zip(parsed, texts):
        if not txt:
            txt = strip_marks(bw_to_ar(seg["text_bw"]))
        segs_json.append([txt, seg["pos"], seg["role"], "|".join(seg["feats"])])
    w["segments"] = segs_json
    w["pos"] = w["_head"]["pos"] if w["_head"] else ""
    w["feats"] = w["_head"]["feats"] if w["_head"] else []
    w["root"] = root_ids.get(w["_root_bw"]) if w["_root_bw"] else None
    w["lemma"] = lemma_ids.get(w["_lemma_bw"]) if w["_lemma_bw"] else None

    # statistics for lemmas
    if w["lemma"] is not None:
        lid = w["lemma"]
        lemma_first.setdefault(lid, w)
        # content stem surface
        c = w["_content"]
        if c:
            # find its displayed text
            try:
                ci = parsed.index(c)
                surf = texts[ci] if ci < len(texts) and texts[ci] else strip_marks(bw_to_ar(c["text_bw"]))
            except ValueError:
                surf = strip_marks(bw_to_ar(c["text_bw"]))
        else:
            surf = w["text"]
        lemma_surfaces[lid][surf] += 1
        if w["translation"]:
            lemma_glosses[lid][w["translation"]] += 1
        lemma_pos[lid][w["pos"]] += 1
        if w["root"] is not None:
            lemma_roots[lid][w["root"]] += 1
        typ, form = derive_type(w["pos"], w["feats"])
        lemma_types[lid][typ] += 1
        if form:
            lemma_verb_form[lid][form] += 1
    if w["root"] is not None:
        rid = w["root"]
        root_first.setdefault(rid, w)
        if w["translation"]:
            root_glosses[rid][w["translation"]] += 1

print("morphology attached")

# ---------------------------------------------------------------------------
# Lemma labels / glosses
# ---------------------------------------------------------------------------
lemmas_out = []
for bw_key, lid in sorted(lemma_ids.items(), key=lambda kv: kv[1]):
    surfaces = lemma_surfaces[lid]
    glosses = lemma_glosses[lid]
    # choose a readable dictionary label and a Qur'anic citation form
    if bw_key.startswith("~"):
        synth = synth_lemmas[bw_key]
        base = synth["plain"]
        display = synth["ar"]
        cite = display
        typ = synth["type"]
        pos = synth["pos"]
        root_id = None
        verb_form = None
        first = lemma_first.get(lid)
        gloss_list = [g for g, _ in glosses.most_common(8)]
        seen = set()
        uniq = []
        for g in gloss_list:
            k = g.lower().strip()
            if not k or k in seen:
                continue
            seen.add(k)
            uniq.append(g)
            if len(uniq) >= 3:
                break
        lemmas_out.append({
            "id": lid, "ar": display, "cite": cite, "plain": base, "bw": bw_key,
            "pos": pos, "type": typ, "form": None, "root": None,
            "count": lemma_counts[bw_key], "gloss": uniq[0] if uniq else "",
            "glosses": uniq, "first": first["id"] if first else None,
            "page": first["page"] if first else None,
        })
        continue

    base = clean_label(bw_key)
    typ_counter = lemma_types[lid]
    typ = typ_counter.most_common(1)[0][0] if typ_counter else ""
    display = base
    cite = base
    if typ.startswith("Verb"):
        # Prefer an active perfect 3rd person masculine singular form.
        cand = collections.Counter()
        for w in words:
            if w["lemma"] == lid and "PERF" in w["_head"]["feats"] and "3MS" in w["_head"]["feats"] and "PASS" not in w["_head"]["feats"]:
                c = w["_content"]
                if c:
                    try:
                        ci = w["_segments"].index(c)
                        cand[w["segments"][ci][0]] += 1
                    except Exception:
                        pass
        if cand:
            cite = verb_citation(cand.most_common(1)[0][0])
    else:
        # Prefer a full-looking surface, then the most frequent.
        def surf_key(item):
            s, n = item
            letters = len(norm_ar(s))
            return (letters >= len(base), n, -letters)
        if surfaces:
            best_surface = max(surfaces.items(), key=surf_key)[0]
            cand = citation_clean(best_surface)
            # avoid partial stems such as سْم for اسم, or a leading assimilated shadda
            if len(norm_ar(cand)) >= len(base) and not cand.startswith("ّ") and not ("ى" in cand and "ا" in base and "ى" not in base):
                cite = cand
    display = cite
    gloss_list = [g for g, _ in glosses.most_common(8)]
    # dedupe case-insensitively and drop very short/duplicate variants
    seen = set()
    uniq = []
    for g in gloss_list:
        k = g.lower().strip()
        if not k or k in seen:
            continue
        seen.add(k)
        uniq.append(g)
        if len(uniq) >= 3:
            break
    gloss = uniq[0] if uniq else ""
    # root id (if the lemma has a consistent root)
    root_id = lemma_roots[lid].most_common(1)[0][0] if lemma_roots[lid] else None
    verb_form = lemma_verb_form[lid].most_common(1)[0][0] if lemma_verb_form[lid] else None
    first = lemma_first.get(lid)
    lemmas_out.append({
        "id": lid,
        "ar": display,
        "cite": cite,
        "plain": base,
        "bw": bw_key,
        "pos": lemma_pos[lid].most_common(1)[0][0] if lemma_pos[lid] else "",
        "type": typ,
        "form": verb_form,
        "root": root_id,
        "count": lemma_counts[bw_key],
        "gloss": gloss,
        "glosses": uniq,
        "first": first["id"] if first else None,
        "page": first["page"] if first else None,
    })

# roots output
roots_out = []
for bw_key, rid in sorted(root_ids.items(), key=lambda kv: kv[1]):
    ar = root_label(bw_key)
    tr = "-".join({"A": "a", "b": "b", "t": "t", "v": "th", "j": "j", "H": "ḥ",
                   "x": "kh", "d": "d", "*": "dh", "r": "r", "z": "z", "s": "s",
                   "$": "sh", "S": "ṣ", "D": "ḍ", "T": "ṭ", "Z": "ẓ", "E": "ʿ",
                   "g": "gh", "f": "f", "q": "q", "k": "k", "l": "l", "m": "m",
                   "n": "n", "h": "h", "w": "w", "y": "y", "'": "ʾ", "{": "a",
                   ">": "a", "<": "i", "&": "u", "|": "a"}.get(c, c) for c in bw_key)
    first = root_first.get(rid)
    roots_out.append({
        "id": rid,
        "ar": ar,
        "bw": bw_key,
        "tr": tr,
        "count": root_counts[bw_key],
        "first": first["id"] if first else None,
        "page": first["page"] if first else None,
    })
print(f"lemmas out: {len(lemmas_out)}  roots out: {len(roots_out)}")

# ---------------------------------------------------------------------------
# Write corpus-sized intermediate for the next stage
# ---------------------------------------------------------------------------
intermediate = {
    "lemmas": lemmas_out,
    "roots": roots_out,
    "words": words,
    "verse_translations": verse_translations,
}
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(ROOT, "data", "intermediate.json"), "w", encoding="utf-8") as f:
    json.dump(intermediate, f, ensure_ascii=False)
print("intermediate written", os.path.getsize(os.path.join(ROOT, "data", "intermediate.json")))
