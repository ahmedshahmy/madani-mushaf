import { useEffect, useMemo, useRef } from 'react'
import {
  BookOpen, Copy, GraduationCap, ListFilter, Share2, Sprout, X,
} from 'lucide-react'
import type { Lemma, Lexicon, Meta, OccFilter, PageData, PanelTab, Root, Word } from '../types'
import { posLabel } from '../lib/grammar'
import { prettyArabic, stripPauseMarks } from '../lib/format'
import { MeaningTab } from './tabs/MeaningTab'
import { RootTab } from './tabs/RootTab'
import { GrammarTab } from './tabs/GrammarTab'
import { OccurrencesTab } from './tabs/OccurrencesTab'

interface WordPanelProps {
  word: Word
  page: PageData
  meta: Meta
  lexicon: Lexicon | null
  tab: PanelTab
  onTabChange: (tab: PanelTab) => void
  onClose: () => void
  onNavigate: (wordId: string, page: number) => void
  onOpenOccurrences: (filter: OccFilter, lemmaId?: number | null) => void
  occFilter: OccFilter
  lemmaFocus: number | null
  onClearLemmaFocus: () => void
  onOpenGrammarGuide: () => void
  onToast: (text: string) => void
  mobile: boolean
  showTranslit: boolean
  lemma?: Lemma
  root?: Root
}

const TABS: Array<{ id: PanelTab; label: string; icon: typeof BookOpen }> = [
  { id: 'meaning', label: 'Meaning', icon: BookOpen },
  { id: 'root', label: 'Root', icon: Sprout },
  { id: 'grammar', label: 'Grammar', icon: GraduationCap },
  { id: 'occurrences', label: 'Uses', icon: ListFilter },
]

export function WordPanel({
  word, page, meta, lexicon, tab, onTabChange, onClose, onNavigate,
  onOpenOccurrences, occFilter, lemmaFocus, onClearLemmaFocus, onOpenGrammarGuide,
  onToast, mobile, showTranslit, lemma: lemmaProp, root: rootProp,
}: WordPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const lemma = lemmaProp ?? (word.l !== undefined ? lexicon?.lemmaById.get(word.l) : undefined)
  const root = rootProp ?? (word.r !== undefined ? lexicon?.rootById.get(word.r) : undefined)
  const verse = page.verses.find((v) => v.k === word.i.split(':').slice(0, 2).join(':'))

  useEffect(() => {
    closeRef.current?.focus()
    bodyRef.current?.scrollTo({ top: 0 })
  }, [word.i])

  const tabs = useMemo(
    () => TABS.filter((t) => t.id !== 'root' || word.r !== undefined),
    [word.r],
  )

  const copyWord = async () => {
    const text = `${word.a}\n${word.t}${word.tr ? ` · ${word.tr}` : ''}\nQur'an ${word.i}`
    try {
      await navigator.clipboard.writeText(text)
      onToast('Word copied')
    } catch {
      onToast('Could not copy')
    }
  }

  const copyLink = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', String(page.p))
    url.searchParams.set('word', word.i)
    try {
      if (navigator.share && mobile) {
        await navigator.share({ title: `Qur'an ${word.i}`, text: `${word.a} — ${word.t}`, url: url.toString() })
      } else {
        await navigator.clipboard.writeText(url.toString())
        onToast('Link copied')
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <aside className={`word-panel ${mobile ? 'is-mobile' : ''}`} role="dialog" aria-modal="true" aria-label={`Word details for ${word.i}`}>
      <div className="panel-drag-handle" aria-hidden="true" />
      <header className="word-panel-head">
        <div className="word-head-top">
          <span className="word-location">
            <span className="dot" />
            {word.i.split(':').slice(0, 2).join(':')} · {posLabel(word.p)}
          </span>
          <div className="word-head-actions">
            <button className="icon-btn" onClick={copyWord} aria-label="Copy word" title="Copy word">
              <Copy size={15} />
            </button>
            <button className="icon-btn" onClick={copyLink} aria-label="Share word" title="Share link">
              <Share2 size={15} />
            </button>
            <button ref={closeRef} className="icon-btn close-btn" onClick={onClose} aria-label="Close word panel">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="word-title-row">
          <div className="word-arabic" dir="rtl">{stripPauseMarks(prettyArabic(word.a))}</div>
          <div className="word-title-meta">
            {word.tr && showTranslit ? <div className="word-translit">{word.tr}</div> : null}
            <div className="word-gloss">{word.t}</div>
            {lemma ? <div className="word-lemma-line"><span>Lemma</span> <b dir="rtl">{lemma.plain}</b></div> : null}
          </div>
        </div>
      </header>

      <nav className="panel-tabs" role="tablist" aria-label="Word details sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`panel-tab ${tab === id ? 'is-active' : ''}`}
            onClick={() => onTabChange(id)}
            aria-selected={tab === id}
            role="tab"
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="panel-body" role="tabpanel" ref={bodyRef}>
        {tab === 'meaning' && (
          <MeaningTab
            word={word}
            page={page}
            verse={verse}
            lemma={lemma}
            root={root}
            onNavigate={onNavigate}
            onOpenOccurrences={onOpenOccurrences}
            onOpenRoot={() => onTabChange('root')}
            showTranslit={showTranslit}
          />
        )}
        {tab === 'root' && (
          <RootTab
            word={word}
            lemma={lemma}
            root={root}
            onOpenOccurrences={onOpenOccurrences}
          />
        )}
        {tab === 'grammar' && (
          <GrammarTab
            word={word}
            lemma={lemma}
            root={root}
            onOpenGrammarGuide={onOpenGrammarGuide}
          />
        )}
        {tab === 'occurrences' && (
          <OccurrencesTab
            word={word}
            meta={meta}
            lexicon={lexicon}
            filter={occFilter}
            onFilterChange={(f) => {
              onClearLemmaFocus()
              onOpenOccurrences(f, null)
            }}
            lemmaFocus={lemmaFocus}
            onClearLemmaFocus={onClearLemmaFocus}
            onNavigate={onNavigate}
          />
        )}
      </div>

      <footer className="panel-foot">
        <span>Qur'an {word.i}</span>
        <span className="panel-foot-sep">·</span>
        <span>{page.p} / {meta.pageCount}</span>
        <span className="panel-foot-sep">·</span>
        <span>{verse?.j ? `Juz ${verse.j}` : ''}</span>
      </footer>
    </aside>
  )
}
