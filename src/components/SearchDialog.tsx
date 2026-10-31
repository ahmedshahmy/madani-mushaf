import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  ArrowRight, BookOpen, Hash, Loader2, Search, Sprout, X,
} from 'lucide-react'
import type { Chapter, Lemma, Lexicon, Meta, PanelTab, Root } from '../types'
import { normalizeArabic } from '../lib/format'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
  meta: Meta | null
  lexicon: Lexicon | null
  onGoPage: (page: number) => void
  onOpenWord: (wordId: string, page: number, tab?: PanelTab) => void
}

type Result =
  | { kind: 'page'; page: number; title: string; sub: string }
  | { kind: 'verse'; key: string; page: number; title: string; sub: string }
  | { kind: 'surah'; chapter: Chapter; title: string; sub: string }
  | { kind: 'lemma'; lemma: Lemma; title: string; sub: string }
  | { kind: 'root'; root: Root; title: string; sub: string }

interface Section {
  label: string
  items: Result[]
}

const QUICK = [
  { key: '2:255', label: 'Āyat al-Kursī', sub: 'The Verse of the Throne' },
  { key: '36:1', label: 'Yā Sīn', sub: 'Sūrah 36' },
  { key: '55:1', label: 'Ar-Raḥmān', sub: 'Sūrah 55' },
  { key: '67:1', label: 'Al-Mulk', sub: 'Sūrah 67' },
  { key: '112:1', label: 'Al-Ikhlāṣ', sub: 'Sūrah 112' },
]

export function SearchDialog({ open, onClose, meta, lexicon, onGoPage, onOpenWord }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      window.setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const sections = useMemo<Section[]>(() => {
    if (!open) return []
    const raw = query.trim()
    if (!raw) {
      if (!meta) return []
      return [{
        label: 'Quick destinations',
        items: QUICK.flatMap((q) => {
          const page = meta.versePages[q.key]
          return page ? [{ kind: 'verse' as const, key: q.key, page, title: q.label, sub: `${q.sub} · ${q.key}` }] : []
        }),
      }]
    }

    const out: Section[] = []
    const qLower = raw.toLowerCase()
    const qAr = normalizeArabic(raw)
    const qArLoose = qAr.replace(/ا/g, '')

    // Page number
    if (/^\d{1,3}$/.test(raw)) {
      const n = Number(raw)
      if (meta && n >= 1 && n <= meta.pageCount) {
        const ch = meta.chapters.find((c) => n >= c.start && n <= c.end)
        out.push({
          label: 'Page',
          items: [{
            kind: 'page', page: n, title: `Page ${n}`,
            sub: ch ? `Sūrah ${ch.name} · ${ch.en}` : 'Madani Mushaf',
          }],
        })
      }
    }

    // Verse key
    const verseMatch = /^(\d{1,3}):(\d{1,3})$/.exec(raw)
    if (verseMatch && meta) {
      const key = `${Number(verseMatch[1])}:${Number(verseMatch[2])}`
      const page = meta.versePages[key]
      if (page) {
        out.push({
          label: 'Verse',
          items: [{ kind: 'verse', key, page, title: `Qur'an ${key}`, sub: `Go to page ${page}` }],
        })
      }
    }

    // Sūrahs
    if (meta) {
      const surahs = meta.chapters.filter((c) => {
        if (/^\d{1,3}$/.test(raw)) return c.id === Number(raw)
        return c.name.toLowerCase().includes(qLower) || c.en.toLowerCase().includes(qLower) || c.ar.includes(raw)
      }).slice(0, 6)
      if (surahs.length) {
        out.push({
          label: 'Sūrahs',
          items: surahs.map((c) => ({
            kind: 'surah' as const, chapter: c,
            title: `${c.id}. ${c.name}`,
            sub: `${c.en} · ${c.verses} verses · page ${c.start}`,
          })),
        })
      }
    }

    if (lexicon) {
      // Words
      const lemmas = lexicon.lemmas
        .filter((l) => {
          if (qAr.length > 0 && /[\u0621-\u064A]/.test(raw)) {
            const ar = normalizeArabic(l.ar)
            const plain = normalizeArabic(l.plain)
            return ar.includes(qAr) || plain.includes(qAr)
              || (qArLoose.length > 0 && (ar.replace(/ا/g, '').includes(qArLoose) || plain.replace(/ا/g, '').includes(qArLoose)))
          }
          return l.gloss.toLowerCase().includes(qLower)
            || l.type.toLowerCase().includes(qLower)
            || l.plain.toLowerCase().includes(qLower)
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 18)
      if (lemmas.length) {
        out.push({
          label: 'Words',
          items: lemmas.map((l) => ({
            kind: 'lemma' as const, lemma: l,
            title: l.ar,
            sub: `${l.gloss || l.type} · ${l.type} · ${l.count.toLocaleString()}×`,
          })),
        })
      }

      // Roots
      const roots = lexicon.roots
        .filter((r) => {
          if (qAr.length > 0 && /[\u0621-\u064A]/.test(raw)) {
            const ar = normalizeArabic(r.ar)
            return ar.includes(qAr) || (qArLoose.length > 0 && ar.replace(/ا/g, '').includes(qArLoose))
          }
          return r.tr.toLowerCase().includes(qLower) || r.bw.toLowerCase().includes(qLower)
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
      if (roots.length) {
        out.push({
          label: 'Roots',
          items: roots.map((r) => ({
            kind: 'root' as const, root: r,
            title: r.ar.split('').join(' '),
            sub: `${r.tr} · ${r.count.toLocaleString()} occurrences`,
          })),
        })
      }
    }

    return out
  }, [open, query, meta, lexicon])

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections])
  useEffect(() => { setActive(0) }, [query])
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-search-index="${active}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const activate = (item: Result) => {
    if (item.kind === 'page') onGoPage(item.page)
    else if (item.kind === 'verse') onGoPage(item.page)
    else if (item.kind === 'surah') onGoPage(item.chapter.start)
    else if (item.kind === 'lemma') onOpenWord(item.lemma.first, item.lemma.page)
    else if (item.kind === 'root') onOpenWord(item.root.first, item.root.page, 'root')
    onClose()
  }

  if (!open) return null

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(flat.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && flat[active]) {
      e.preventDefault()
      activate(flat[active])
    }
  }

  let index = -1

  return (
    <div className="overlay search-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="search-dialog" role="dialog" aria-modal="true" aria-label="Search the Qur'an">
        <div className="search-input-row">
          <Search size={19} className="search-icon" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search a word, root, sūrah, page or verse…"
            aria-label="Search query"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
          <button className="icon-btn" onClick={onClose} aria-label="Close search"><X size={17} /></button>
        </div>

        <div className="search-results" ref={listRef}>
          {!lexicon && query.trim() ? (
            <div className="search-loading"><Loader2 size={17} className="spin" /> Loading the word index…</div>
          ) : null}

          {lexicon && sections.length === 0 ? (
            <div className="search-empty">
              <div className="empty-icon"><Search size={20} /></div>
              <p>No matches for “{query}”.</p>
              <span>Try an Arabic word, an English meaning, a root like <b>k-t-b</b>, or a reference like <b>2:255</b>.</span>
            </div>
          ) : null}

          {sections.map((section) => (
            <div className="search-section" key={section.label}>
              <div className="search-section-label">{section.label}</div>
              {section.items.map((item) => {
                index += 1
                const myIndex = index
                return (
                  <button
                    key={`${item.kind}-${myIndex}`}
                    className={`search-result ${active === myIndex ? 'is-active' : ''}`}
                    onMouseEnter={() => setActive(myIndex)}
                    onClick={() => activate(item)}
                    data-search-index={myIndex}
                  >
                    <span className={`search-result-icon kind-${item.kind}`}>
                      {item.kind === 'lemma' ? <BookOpen size={15} /> : item.kind === 'root' ? <Sprout size={15} /> : item.kind === 'surah' ? <BookOpen size={15} /> : <Hash size={15} />}
                    </span>
                    <span className="search-result-body">
                      <span className="search-result-title" dir={item.kind === 'lemma' || item.kind === 'root' ? 'rtl' : 'ltr'}>
                        {item.title}
                      </span>
                      <span className="search-result-sub">{item.sub}</span>
                    </span>
                    <ArrowRight size={14} className="search-result-arrow" />
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="search-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span className="search-foot-note">Word glosses: Quran.com · Morphology: Quranic Arabic Corpus</span>
        </div>
      </div>
    </div>
  )
}
