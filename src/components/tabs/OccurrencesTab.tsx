import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ListFilter, Loader2, RotateCcw, X } from 'lucide-react'
import type { Lexicon, Meta, OccFilter, Occurrence, Word } from '../../types'
import { loadOccurrencesForWord } from '../../lib/data'
import { formatNumber, normalizeArabic, prettyArabic } from '../../lib/format'

interface OccurrencesTabProps {
  word: Word
  meta: Meta
  lexicon: Lexicon | null
  filter: OccFilter
  onFilterChange: (filter: OccFilter) => void
  lemmaFocus: number | null
  onClearLemmaFocus: () => void
  onNavigate: (wordId: string, page: number) => void
}

const PAGE_SIZE = 24

export function OccurrencesTab({
  word, meta, lexicon, filter, onFilterChange, lemmaFocus, onClearLemmaFocus, onNavigate,
}: OccurrencesTabProps) {
  const [data, setData] = useState<Occurrence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [reload, setReload] = useState(0)

  const focusLemma = lemmaFocus !== null ? lexicon?.lemmaById.get(lemmaFocus) : undefined
  const wordLemma = word.l !== undefined ? lexicon?.lemmaById.get(word.l) : undefined
  const targetLemma = lemmaFocus ?? word.l

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    setData([])
    setVisible(PAGE_SIZE)
    loadOccurrencesForWord(word)
      .then((rows) => { if (alive) { setData(rows); setLoading(false) } })
      .catch((err) => { if (alive) { setError(err instanceof Error ? err.message : 'Could not load occurrences'); setLoading(false) } })
    return () => { alive = false }
  }, [word.i, word.r, word.l, reload])

  useEffect(() => { setVisible(PAGE_SIZE) }, [filter, lemmaFocus])

  const formNorm = useMemo(() => normalizeArabic(word.a), [word.a])

  const formCount = useMemo(
    () => data.reduce((n, o) => n + (normalizeArabic(o.text) === formNorm ? 1 : 0), 0),
    [data, formNorm],
  )
  const lemmaCount = useMemo(
    () => data.reduce((n, o) => n + (o.lemma === targetLemma ? 1 : 0), 0),
    [data, targetLemma],
  )

  const filtered = useMemo(() => {
    if (loading) return []
    if (filter === 'form') return data.filter((o) => normalizeArabic(o.text) === formNorm)
    if (filter === 'lemma') return data.filter((o) => o.lemma === targetLemma)
    return data
  }, [data, filter, formNorm, targetLemma, loading])

  const shown = filtered.slice(0, visible)

  const groups = useMemo(() => {
    const out: Array<{ surah: number; items: Occurrence[] }> = []
    for (const item of shown) {
      const s = Number(item.id.split(':')[0])
      const last = out[out.length - 1]
      if (!last || last.surah !== s) out.push({ surah: s, items: [item] })
      else last.items.push(item)
    }
    return out
  }, [shown])

  const chapterName = (id: number) => meta.chapters.find((c) => c.id === id)

  return (
    <div className="tab-stack occ-tab">
      <div className="occ-controls">
        <div className="occ-filter" role="tablist" aria-label="Occurrence filter">
          <button
            className={`filter-btn ${filter === 'form' ? 'is-active' : ''}`}
            onClick={() => onFilterChange('form')}
            role="tab"
            aria-selected={filter === 'form'}
          >
            This form{!loading ? <em>{formatNumber(formCount)}</em> : null}
          </button>
          <button
            className={`filter-btn ${filter === 'lemma' ? 'is-active' : ''}`}
            onClick={() => onFilterChange('lemma')}
            role="tab"
            aria-selected={filter === 'lemma'}
          >
            {focusLemma ? 'This lemma' : 'This word'}{!loading ? <em>{formatNumber(lemmaCount)}</em> : null}
          </button>
          {word.r !== undefined ? (
            <button
              className={`filter-btn ${filter === 'root' ? 'is-active' : ''}`}
              onClick={() => onFilterChange('root')}
              role="tab"
              aria-selected={filter === 'root'}
            >
              Root{!loading ? <em>{formatNumber(data.length)}</em> : null}
            </button>
          ) : null}
        </div>

        {focusLemma ? (
          <div className="focus-banner">
            <span>
              Showing every use of <b dir="rtl">{focusLemma.plain}</b> ({focusLemma.type}).
            </span>
            <button className="mini-btn" onClick={onClearLemmaFocus} aria-label="Clear lemma focus">
              <X size={12} /> Clear
            </button>
          </div>
        ) : null}

        <div className="occ-summary">
          <span>
            {loading ? 'Loading occurrences…' : error ? 'Could not load' : (
              <>
                <b>{formatNumber(filtered.length)}</b> {filtered.length === 1 ? 'occurrence' : 'occurrences'}
                {filter === 'form' ? ' of this exact form' : filter === 'lemma' ? ' of this dictionary word' : ' from this root'}
              </>
            )}
          </span>
          {filter === 'form' && !loading && formCount === 1 && word.l !== undefined ? (
            <button className="text-link" onClick={() => onFilterChange('lemma')}>
              See all inflections
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="inline-error">
          <span>{error}</span>
          <button className="btn btn-ghost small" onClick={() => setReload((n) => n + 1)}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="occ-skeleton">
          {[0, 1, 2, 3, 4].map((i) => (
            <div className="skeleton occ-skeleton-row" key={i} style={{ animationDelay: `${i * 70}ms` }} />
          ))}
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="panel-card empty-card compact">
          <div className="empty-icon"><ListFilter size={20} /></div>
          <h3>No occurrences</h3>
          <p>No words match this filter.</p>
        </div>
      ) : null}

      {!loading && !error && groups.map((group) => {
        const chapter = chapterName(group.surah)
        return (
          <section className="occ-group" key={group.surah}>
            <div className="occ-group-head">
              <span className="occ-surah-num">{group.surah}</span>
              <span className="occ-surah-name">{chapter?.name ?? `Sūrah ${group.surah}`}</span>
              <span className="occ-surah-ar" dir="rtl">{chapter?.ar ?? ''}</span>
            </div>
            <div className="occ-list">
              {group.items.map((o) => {
                const active = o.id === word.i
                return (
                  <button
                    className={`occ-item ${active ? 'is-current' : ''}`}
                    key={o.id}
                    onClick={() => onNavigate(o.id, o.page)}
                    title={`Open Qur'an ${o.id}`}
                  >
                    <span className="occ-ref">{o.id.split(':').slice(0, 2).join(':')}</span>
                    <span className="occ-context" dir="rtl">
                      {o.before ? <span className="occ-ctx">{o.before} </span> : null}
                      <mark>{prettyArabic(o.text)}</mark>
                      {o.after ? <span className="occ-ctx"> {o.after}</span> : null}
                    </span>
                    <span className="occ-gloss">{o.gloss || '—'}</span>
                    <span className="occ-page">p. {o.page}</span>
                    {active ? <span className="occ-here">here</span> : null}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      {!loading && filtered.length > visible ? (
        <button className="btn btn-ghost load-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          <ChevronDown size={15} />
          Show {formatNumber(Math.min(PAGE_SIZE, filtered.length - visible))} more
        </button>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <p className="fine-note occ-note">
          Occurrences are ordered by their place in the mushaf. Tap any verse to open it.
          {wordLemma ? ` “${wordLemma.gloss}” is one of ${formatNumber(wordLemma.count)} uses of this lemma.` : ''}
        </p>
      ) : null}

      <p className="fine-note source-note">
        Word glosses from Quran.com. Occurrence matching is based on the Quranic Arabic Corpus lemmas and roots.
      </p>
    </div>
  )
}
