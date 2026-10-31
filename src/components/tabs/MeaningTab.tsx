import { ArrowUpRight, BookMarked, Layers, ListFilter, Sprout } from 'lucide-react'
import type { Lemma, OccFilter, PageData, Root, VerseMeta, Word } from '../../types'
import { isSegment } from '../../lib/grammar'
import { formatNumber, prettyArabic } from '../../lib/format'

interface MeaningTabProps {
  word: Word
  page: PageData
  verse?: VerseMeta
  lemma?: Lemma
  root?: Root
  onNavigate: (wordId: string, page: number) => void
  onOpenOccurrences: (filter: OccFilter, lemmaId?: number | null) => void
  onOpenRoot: () => void
  showTranslit: boolean
}

export function MeaningTab({ word, page, verse, lemma, root, onNavigate, onOpenOccurrences, onOpenRoot, showTranslit }: MeaningTabProps) {
  const verseKey = word.i.split(':').slice(0, 2).join(':')
  const verseWords = page.lines
    .flatMap((l) => l.w ?? [])
    .filter(isSegment)
    .filter((w) => w.i.startsWith(`${verseKey}:`))

  return (
    <div className="tab-stack">
      <section className="panel-card meaning-card">
        <div className="card-eyebrow">Word-by-word meaning</div>
        <p className="meaning-primary">{word.t}</p>
        {word.tr && showTranslit ? <p className="meaning-translit">{word.tr}</p> : null}
        <p className="fine-note">
          This is a concise gloss from the word-by-word translation. The full sense depends on the verse and its context.
        </p>
      </section>

      <section className="panel-card verse-card">
        <div className="card-heading">
          <span className="card-eyebrow">In this verse</span>
          <span className="verse-ref">{verseKey}</span>
        </div>
        <p className="verse-arabic" dir="rtl">
          {verseWords.map((w) => (
            <span
              key={w.i}
              className={`verse-word ${w.i === word.i ? 'is-current' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => onNavigate(w.i, page.p)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(w.i, page.p) }
              }}
              title={w.t}
            >
              {prettyArabic(w.a)}{' '}
            </span>
          ))}
        </p>
        {verse?.t ? <p className="verse-translation">{verse.t}</p> : null}
        <p className="fine-note">Translation: Saheeh International</p>
      </section>

      <div className="family-grid">
        {lemma ? (
          <button className="family-card" onClick={() => onOpenOccurrences('lemma', null)}>
            <span className="family-icon"><BookMarked size={16} /></span>
            <span className="family-label">Dictionary word</span>
            <span className="family-ar" dir="rtl">{lemma.plain}</span>
            <span className="family-meta">{lemma.type} · {formatNumber(lemma.count)}×</span>
            <span className="family-link">All uses <ArrowUpRight size={12} /></span>
          </button>
        ) : null}

        {root ? (
          <button className="family-card" onClick={onOpenRoot}>
            <span className="family-icon"><Sprout size={16} /></span>
            <span className="family-label">Root</span>
            <span className="family-ar root-ar" dir="rtl">{root.ar.split('').join(' ')}</span>
            <span className="family-meta">{root.tr} · {formatNumber(root.count)}×</span>
            <span className="family-link">Derivations <ArrowUpRight size={12} /></span>
          </button>
        ) : word.r !== undefined ? (
          <div className="family-card is-static">
            <span className="family-icon"><Sprout size={16} /></span>
            <span className="family-label">Root</span>
            <span className="family-ar">…</span>
            <span className="family-meta">Loading the root family…</span>
          </div>
        ) : (
          <div className="family-card is-static">
            <span className="family-icon"><Layers size={16} /></span>
            <span className="family-label">Root</span>
            <span className="family-ar">—</span>
            <span className="family-meta">This is a particle or pronoun, so it has no triliteral root.</span>
          </div>
        )}

        <button className="family-card" onClick={() => onOpenOccurrences('form', null)}>
          <span className="family-icon"><ListFilter size={16} /></span>
          <span className="family-label">Occurrences</span>
          <span className="family-ar small">this form</span>
          <span className="family-meta">See every matching word in the Qur'an</span>
          <span className="family-link">Explore <ArrowUpRight size={12} /></span>
        </button>
      </div>

      <section className="panel-card gentle-card">
        <div className="card-eyebrow">How to read this</div>
        <p>
          Tap <b>Root</b> to see the triliteral root and the family of words derived from it.
          Tap <b>Grammar</b> for the word’s case, tense and attached particles.
          Tap <b>Uses</b> to see every occurrence in the Qur'an.
        </p>
      </section>
    </div>
  )
}
