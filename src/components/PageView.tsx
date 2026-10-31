import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { EndMarker, Line, Meta, PageData, Word } from '../types'
import { arabicDigits, prettyArabic } from '../lib/format'
import { isSegment } from '../lib/grammar'

interface PageViewProps {
  page: PageData
  meta: Meta | null
  selectedWordId: string | null
  onWordClick: (word: Word) => void
  fontScale: number
}

function isWord(item: Word | EndMarker): item is Word {
  return isSegment(item)
}

export function PageView({ page, meta, selectedWordId, onWordClick, fontScale }: PageViewProps) {
  const chapterById = useMemo(() => new Map((meta?.chapters ?? []).map((c) => [c.id, c])), [meta])
  const shortPage = page.lines.length < 15
  const lineCount = shortPage ? page.lines.length : 15
  const pageRef = useRef<HTMLElement>(null)
  const [fitPx, setFitPx] = useState<number | null>(null)

  // Fit the longest verse line to the page width so every mushaf line stays
  // on a single line, even on a narrow phone. Without this the fixed 15-line
  // grid would wrap and overlap.
  useEffect(() => {
    let cancelled = false
    const measure = () => {
      const el = pageRef.current
      const inner = el?.querySelector<HTMLElement>('.mushaf-inner')
      if (!el || !inner) return
      const cs = getComputedStyle(inner)
      const avail = inner.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      if (avail <= 40) return
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.font = '100px "Scheherazade New", "Noto Naskh Arabic", serif'
      let max = 0
      for (const line of page.lines) {
        if (line.t !== 'a') continue
        const items = line.w ?? []
        if (!items.length) continue
        let text = ''
        let endCount = 0
        for (const item of items) {
          if (isWord(item)) text += (text ? ' ' : '') + item.a
          else { text += (text ? ' ' : '') + item.e; endCount += 1 }
        }
        // span padding + inter-word space + the ring around a verse number
        const extra = items.length * 9 + endCount * 95
        const w = ctx.measureText(text).width + extra
        if (w > max) max = w
      }
      if (max > 0 && !cancelled) {
        const fit = Math.max(10, Math.min(34, ((avail - 6) / max) * 100 * 0.985))
        setFitPx(fit)
      }
    }
    const run = async () => {
      try { await document.fonts.load('100px "Scheherazade New"') } catch { /* fall back */ }
      try { await document.fonts.ready } catch { /* ignore */ }
      requestAnimationFrame(measure)
    }
    run()
    const ro = new ResizeObserver(() => requestAnimationFrame(measure))
    if (pageRef.current) ro.observe(pageRef.current)
    window.addEventListener('resize', measure)
    return () => {
      cancelled = true
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [page])

  return (
    <article
      ref={pageRef}
      className={`mushaf-page ${shortPage ? 'is-frontispiece' : ''}`}
      style={{
        ['--font-scale' as string]: fontScale,
        ['--line-count' as string]: lineCount,
        ...(fitPx ? { ['--fit-font-size' as string]: `${fitPx}px` } : {}),
      }}
      aria-label={`Madani Mushaf page ${page.p}`}
    >
      <span className="frame-corner tl" aria-hidden="true" />
      <span className="frame-corner tr" aria-hidden="true" />
      <span className="frame-corner bl" aria-hidden="true" />
      <span className="frame-corner br" aria-hidden="true" />

      <div className="mushaf-inner">
        <div className="page-crest" aria-hidden="true">
          <span className="crest-line" />
          <span className="crest-star">✦</span>
          <span className="crest-line" />
        </div>

        <div className="mushaf-lines">
          {page.lines.map((line) => (
            <LineView
              key={`${page.p}-${line.l}-${line.t}`}
              line={line}
              meta={meta}
              chapterById={chapterById}
              selectedWordId={selectedWordId}
              onWordClick={onWordClick}
            />
          ))}
        </div>

        <div className="page-seal" aria-hidden="true">
          <span className="seal-ring">{arabicDigits(page.p)}</span>
        </div>
      </div>
    </article>
  )
}

interface LineViewProps {
  line: Line
  meta: Meta | null
  chapterById: Map<number, NonNullable<Meta['chapters'][number]>>
  selectedWordId: string | null
  onWordClick: (word: Word) => void
}

const LineView = memo(function LineView({ line, meta, chapterById, selectedWordId, onWordClick }: LineViewProps) {
  if (line.t === 's') {
    const chapter = line.s ? chapterById.get(line.s) : undefined
    return (
      <div className="surah-band" title={chapter ? `Sūrah ${chapter.name} — ${chapter.en}` : undefined}>
        <span className="band-ornament" aria-hidden="true">۞</span>
        <span className="surah-band-inner">
          <span className="surah-band-label">سُورَةُ</span>
          <span className="surah-band-name">{chapter?.ar ?? ''}</span>
        </span>
        <span className="band-ornament" aria-hidden="true">۞</span>
      </div>
    )
  }

  if (line.t === 'b') {
    return (
      <div className="basmala-line" dir="rtl">
        <span className="basmala-text">{meta?.basmala ?? 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'}</span>
      </div>
    )
  }

  const items = line.w ?? []
  const centered = line.c === 1 || items.filter(isWord).length <= 2
  return (
    <p className={`ayah-line ${centered ? 'is-centered' : ''}`} dir="rtl">
      {items.map((item, index) => (
        <span className="line-item" key={isWord(item) ? item.i : `${item.v}-end-${index}`}>
          {isWord(item) ? (
            <WordToken
              word={item}
              active={selectedWordId === item.i}
              onClick={onWordClick}
            />
          ) : (
            <span className="ayah-marker" title={`Verse ${item.v}`} aria-label={`Verse ${item.v}`}>
              {item.e}
            </span>
          )}
          {index < items.length - 1 ? ' ' : null}
        </span>
      ))}
    </p>
  )
})

function WordToken({ word, active, onClick }: { word: Word; active: boolean; onClick: (word: Word) => void }) {
  const handle = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) return
    onClick(word)
  }
  return (
    <span
      className={`qword ${active ? 'is-active' : ''}`}
      role="button"
      tabIndex={0}
      data-word-id={word.i}
      title={`${word.t}${word.tr ? ` · ${word.tr}` : ''}`}
      aria-label={`${prettyArabic(word.a)} — ${word.t}. Open word details.`}
      onClick={handle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handle()
        }
      }}
    >
      {word.a}
    </span>
  )
}
