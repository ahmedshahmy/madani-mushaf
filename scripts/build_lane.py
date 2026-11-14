#!/usr/bin/env python3
"""Extract Lane's Arabic-English Lexicon entries for the Qur'anic roots.

Source: Perseus Digital Library's TEI XML of Lane's Lexicon (1863-1893),
via the CLTK arabic_text_perseus repository. The electronic text is
public-domain dictionary content, with the Perseus attribution terms.
Arabic words, encoded in Latin transliteration (Buckwalter-like), are
converted to Arabic script for display.
"""
import glob
import html
import json
import os
import re
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QURAN = os.path.join(ROOT, "public", "quran")
LANE = os.path.join(ROOT, "data", "raw", "lane")
OUT = os.path.join(QURAN, "lane")
MAX_HTML = 55_000

os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------------------
# Root normalisation
# ---------------------------------------------------------------------------
def norm(s: str) -> str:
    s = (s.replace("A^", "A").replace("Y", "y")
         .replace("|", "A").replace("{", "A").replace("@", "A").replace("^", ""))
    s = re.sub(r"[^A-Za-z\u0600-\u06FF]", "", s)
    s = re.sub(r"[aiuoFNK~`_]", "", s)
    return s

def variants(r: str):
    out = {r}
    if len(r) >= 3 and r[-1] == r[-2]:
        out.add(r[:-1])
    if len(r) == 2:
        out.add(r + r[-1])
    return out

def weak_same(a: str, b: str) -> bool:
    if a == b:
        return True
    if len(a) != len(b) or len(a) < 2:
        return False
    if a[0] != b[0] or a[-1] != b[-1]:
        return False
    return all(c in "Awy" for c in a[1:-1] + b[1:-1])

def tokens(n: str):
    return [norm(x) for x in re.split(r"[\s,&]+", n or "") if norm(x)]

# ---------------------------------------------------------------------------
# Load the Qur'anic roots and Lane divisions
# ---------------------------------------------------------------------------
lexicon = json.load(open(os.path.join(QURAN, "lexicon.json"), encoding="utf-8"))
qroots = [{"id": x[0], "ar": x[1], "bw": x[2], "tr": x[3]} for x in lexicon["roots"]]

divs = []
div_tokens = {}
known = set()
for path in sorted(glob.glob(os.path.join(LANE, "*.xml"))):
    tree = ET.parse(path)
    for d in tree.getroot().iter("div2"):
        if d.get("type") != "root":
            continue
        toks = tokens(d.get("n", ""))
        entries = [e for e in list(d) if e.tag == "entryFree"]
        for t in toks:
            known.add(t)
            known.update(variants(t))
            div_tokens.setdefault(t, []).append((path, d, entries))
        divs.append((path, d, toks))
for r in qroots:
    n = norm(r["bw"])
    known.add(n)
    known.update(variants(n))

def root_markers(entry):
    forms = entry.findall("form")
    if not forms:
        return []
    out = []
    for o in forms[0].findall("orth"):
        if o.get("lang") != "ar":
            continue
        n = norm("".join(o.itertext()))
        if 2 <= len(n) <= 5:
            out.append(n)
    return out

# ---------------------------------------------------------------------------
# Group entries by the root they belong to
# ---------------------------------------------------------------------------
groups = {}
parents = {}

def add(root, entry, parent):
    groups.setdefault(root, [])
    if entry not in groups[root]:
        groups[root].append(entry)
    parents.setdefault(root, [])
    if parent not in parents[root]:
        parents[root].append(parent)

for path, d, toks in divs:
    entries = [e for e in list(d) if e.tag == "entryFree"]
    if not entries:
        continue
    aliases = {t for t in toks if t in known}
    if not aliases and toks:
        aliases = {toks[0]}
    if not aliases:
        aliases = {norm(d.get("n", ""))}
    cur = set(aliases)
    parent = (path, d)
    for e in entries:
        ms = root_markers(e)
        keep = any(weak_same(m, c) for m in ms for c in cur)
        if not keep:
            km = [m for m in ms if m in known]
            if km:
                cur = {km[0]}
        for c in cur:
            add(c, e, parent)

# If a root has only a token entry, fall back to the larger containing article.
for bw in [r["bw"] for r in qroots]:
    keys = variants(norm(bw))
    count = sum(len(groups.get(k, [])) for k in keys)
    if count >= 2:
        continue
    best = None
    for k in keys:
        for parent in parents.get(k, []):
            d = parent[1]
            entries = [e for e in list(d) if e.tag == "entryFree"]
            if best is None or len(entries) > len(best[1]):
                best = (k, entries, parent)
    if best:
        for e in best[1]:
            add(best[0], e, best[2])

# Final fallback: Lane often groups a weak 3-letter root under its 2-letter
# parent. Use that article when no direct group exists.
def target_group(bw):
    keys = variants(norm(bw))
    for k in keys:
        if groups.get(k):
            return k, "direct"
    for k in keys:
        if k in div_tokens and any(es for _, _, es in div_tokens[k]):
            return k, "div2"
    two = norm(bw)[:2]
    if len(two) == 2 and groups.get(two):
        return two, "parent"
    return None, None

# ---------------------------------------------------------------------------
# Arabic transliteration -> Arabic script
# ---------------------------------------------------------------------------
BW = {
    "'": "ء", "|": "ا", ">": "أ", "&": "ؤ", "<": "إ", "}": "ئ",
    "A": "ا", "b": "ب", "p": "ة", "t": "ت", "v": "ث", "j": "ج",
    "H": "ح", "x": "خ", "d": "د", "*": "ذ", "r": "ر", "z": "ز",
    "s": "س", "$": "ش", "S": "ص", "D": "ض", "T": "ط", "Z": "ظ",
    "E": "ع", "g": "غ", "_": "", "f": "ف", "q": "ق", "k": "ك",
    "l": "ل", "m": "م", "n": "ن", "h": "ه", "w": "و", "Y": "ى",
    "y": "ي", "F": "ً", "N": "ٌ", "K": "ٍ", "a": "َ", "u": "ُ",
    "i": "ِ", "~": "ّ", "o": "ْ", "`": "ٰ", "{": "ا", "@": "ٱ",
    "^": "ء",
}

AR_RE = re.compile(r"[\u0600-\u06FF]")

def lane_arabic(s: str) -> str:
    s = s.strip()
    if not s:
        return ""
    if s in ("*", "**", "***"):
        return s
    if AR_RE.search(s):
        return s
    s = s.replace("A^", ">").replace("A@", "{")
    s = s.replace("=", "")
    s = re.sub(r"(?<=[Awy|])o", "", s)
    out = []
    for c in s:
        if c in BW:
            out.append(BW[c])
        elif c in " \t\n":
            out.append(" ")
        else:
            out.append(c)
    return "".join(out)

# ---------------------------------------------------------------------------
# TEI -> compact HTML
# ---------------------------------------------------------------------------
def esc(s):
    return html.escape(s, quote=False)

def clean_ws(s):
    return re.sub(r"\s+", " ", s or "")

def render_children(e):
    out = [esc(clean_ws(e.text))]
    for child in e:
        out.append(render_node(child))
        out.append(esc(clean_ws(child.tail)))
    return "".join(out)

def render_node(e):
    tag = e.tag
    if tag == "entryFree":
        return '<div class="lane-entry">' + render_children(e) + "</div>"
    if tag == "form":
        return '<span class="lane-form">' + render_children(e) + "</span>"
    if tag == "itype":
        return ""
    if tag in ("orth", "foreign"):
        text = lane_arabic("".join(e.itertext()))
        return '<span class="lane-ar" lang="ar" dir="rtl">' + esc(text) + "</span>"
    if tag == "hi":
        return "<em>" + render_children(e) + "</em>"
    if tag == "pb":
        n = e.get("n", "")
        return '<span class="lane-pb" title="Lane page ' + esc(n) + '">p.&nbsp;' + esc(n) + "</span>"
    if tag == "quote":
        return "<q>" + render_children(e) + "</q>"
    if tag in ("head", "note"):
        return ""
    if tag == "ref":
        return '<span class="lane-ref">' + render_children(e) + "</span>"
    return render_children(e)

def page_numbers(entries):
    nums = []
    for e in entries:
        for pb in e.iter("pb"):
            n = (pb.get("n") or "").strip()
            if n.isdigit():
                nums.append(int(n))
    if not nums:
        return None
    return [min(nums), max(nums)]

def plain_text(entries):
    return " ".join(" ".join(e.itertext()) for e in entries)

# ---------------------------------------------------------------------------
# Build one file per root
# ---------------------------------------------------------------------------
missing = []
matched = {"direct": 0, "parent": 0}
written = 0
total_bytes = 0
top = []

for r in qroots:
    key, match = target_group(r["bw"])
    if not key:
        missing.append(r["bw"])
        data = {
            "id": r["id"], "root": r["ar"], "bw": r["bw"], "tr": r["tr"],
            "found": False, "html": "", "pages": None, "chars": 0,
            "entries": 0, "truncated": False, "match": None, "key": None,
        }
    else:
        if key in div_tokens and not groups.get(key):
            entries = []
            for _, _, es in div_tokens[key]:
                entries.extend(es)
        else:
            entries = groups.get(key, [])
        # Preserve XML document order, which is Lane's form order.
        render = []
        used_pages = []
        truncated = False
        chars = len(plain_text(entries))
        for e in entries:
            block = render_node(e)
            if len("".join(render)) + len(block) > MAX_HTML and render:
                truncated = True
                break
            render.append(block)
            for pb in e.iter("pb"):
                n = (pb.get("n") or "").strip()
                if n.isdigit():
                    used_pages.append(int(n))
        body = "".join(render)
        pages = page_numbers(entries)
        if pages:
            used_pages = [min(used_pages), max(used_pages)] if used_pages else pages
        else:
            used_pages = None
        data = {
            "id": r["id"],
            "root": r["ar"],
            "bw": r["bw"],
            "tr": r["tr"],
            "found": bool(body),
            "html": body,
            "pages": pages,
            "shownPages": used_pages,
            "chars": chars,
            "entries": len(entries),
            "shownEntries": len(render),
            "truncated": truncated,
            "match": match,
            "key": key,
        }
        matched[match] = matched.get(match, 0) + 1
    path = os.path.join(OUT, f"{r['id']}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    written += 1
    total_bytes += os.path.getsize(path)
    top.append((os.path.getsize(path), r["bw"], data.get("entries"), data.get("truncated")))

# clean stale files from previous builds
for old in glob.glob(os.path.join(OUT, "*.json")):
    try:
        rid = int(os.path.basename(old).split(".")[0])
        if not any(r["id"] == rid for r in qroots):
            os.remove(old)
    except ValueError:
        os.remove(old)

report = {
    "roots": len(qroots),
    "written": written,
    "found": written - len(missing),
    "missing": len(missing),
    "missingRoots": sorted(missing),
    "matched": matched,
    "bytes": total_bytes,
    "maxHtml": MAX_HTML,
    "largest": sorted(top, reverse=True)[:15],
}
with open(os.path.join(ROOT, "data", "lane-report.json"), "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=1)

print(json.dumps({k: v for k, v in report.items() if k != "largest"}, ensure_ascii=False))
print("largest:", report["largest"][:5])
