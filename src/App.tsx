import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Info, Sparkles, X } from 'lucide-react'
import type {
  Lexicon, Meta, OccFilter, PageData, PanelTab, Word,
} from './types'
import { loadLexicon, loadMeta, loadPage, prefetchPage } from './lib/data'
import { isSegment } from './lib/grammar'
import { clamp } from './lib/format'
import { useLocalStorage, useMediaQuery, useTheme, useToasts } from './lib/hooks'
import { Header } from './components/Header'
import { PageView } from './components/PageView'
import { PageError, PageSkeleton } from './components/PageSkeleton'
import { WordPanel } from './components/WordPanel'
import { SearchDialog } from './components/SearchDialog'
import { SettingsPopover } from './components/SettingsPopover'
import { BookmarksDialog, type BookmarkEntry } from './components/BookmarksDialog'
import { GrammarGuideDialog } from './components/GrammarGuideDialog'
import { AboutDialog } from './components/AboutDialog'
import { Toasts } from './components/Toasts'

interface InitialState {
  page: number
  word: string | null
  hadPageParam: boolean
}

function readInitial(): InitialState {
  const params = new URLSearchParams(window.location.search)
  const rawPage = params.get('page')
  const hadPageParam = rawPage !== null
  let page = rawPage ? parseInt(rawPage, 10) : NaN
  if (!Number.isFinite(page)) {
    const stored = Number(localStorage.getItem('mushaf.lastPage'))
    page = Number.isFinite(stored) && stored >= 1 ? stored : 1
  }
  page = clamp(page, 1, 604)
  const word = params.get('word')
  return { page, word: word && /^\d+:\d+:\d+$/.test(word) ? word : null, hadPageParam }
}

export default function App() {
  const initial = useRef<InitialState | null>(null)
  if (!initial.current) initial.current = readInitial()

  const [meta, setMeta] = useState<Meta | null>(null)
  const [metaError, setMetaError] = useState(false)
  const [lexicon, setLexicon] = useState<Lexicon | null>(null)
  const [pageNum, setPageNum] = useState(initial.current.page)
  const [page, setPage] = useState<PageData | null>(null)
  const [loadingPage, setLoadingPage] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')

  const [selectedWordId, setSelectedWordId] = useState<string | null>(initial.current.word)
  const [panelTab, setPanelTab] = useState<PanelTab>('meaning')
  const [occFilter, setOccFilter] = useState<OccFilter>('form')
  const [lemmaFocus, setLemmaFocus] = useState<number | null>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bookmarksOpen, setBookmarksOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [grammarGuideOpen, setGrammarGuideOpen] = useState(false)

  const [bookmarks, setBookmarks] = useLocalStorage<BookmarkEntry[]>('mushaf.bookmarks', [])
  const [fontScale, setFontScale] = useLocalStorage<number>('mushaf.fontScale', 1)
  const [showTranslit, setShowTranslit] = useLocalStorage<boolean>('mushaf.translit', true)
  const [hintDismissed, setHintDismissed] = useLocalStorage<boolean>('mushaf.hintDismissed', false)

  const { theme, setTheme, resolved } = useTheme()
  const isMobile = useMediaQuery('(max-width: 860px)')
  const { toasts, push: pushToast, dismiss } = useToasts()

  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  /* ---------------------------------------------------------------- */
  /* boot                                                              */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let alive = true
    loadMeta()
      .then((m) => { if (alive) setMeta(m) })
      .catch(() => { if (alive) setMetaError(true) })
    loadLexicon()
      .then((l) => { if (alive) setLexicon(l) })
      .catch(() => { if (alive) pushToast('The word index could not be loaded') })
    return () => { alive = false }
  }, [pushToast])

  // If the URL carries a word but no page, find the page from the verse map.
  useEffect(() => {
    if (!meta || initial.current?.hadPageParam || !selectedWordId) return
    const verseKey = selectedWordId.split(':').slice(0, 2).join(':')
    const target = meta.versePages[verseKey]
    if (target && target !== pageNum) setPageNum(target)
    // only on first meta load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta])

  /* ---------------------------------------------------------------- */
  /* page loading                                                      */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let alive = true
    setLoadingPage(true)
    setPageError(null)
    loadPage(pageNum)
      .then((p) => {
        if (!alive) return
        setPage(p)
        setLoadingPage(false)
        localStorage.setItem('mushaf.lastPage', String(pageNum))
      })
      .catch((err) => {
        if (!alive) return
        setPageError(err instanceof Error ? err.message : 'Could not load this page')
        setLoadingPage(false)
      })
    return () => { alive = false }
  }, [pageNum, reloadToken])

  // prefetch neighbours after the page settles
  useEffect(() => {
    if (loadingPage) return
    const timer = window.setTimeout(() => {
      prefetchPage(pageNum + 1)
      prefetchPage(pageNum - 1)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [pageNum, loadingPage])

  // clear a stale word if it is not on the freshly loaded page
  useEffect(() => {
    if (!page || page.p !== pageNum || !selectedWordId) return
    const found = page.lines.some((l) => (l.w ?? []).some((item) => isSegment(item) && item.i === selectedWordId))
    if (!found && !loadingPage) setSelectedWordId(null)
  }, [page, pageNum, selectedWordId, loadingPage])

  /* ---------------------------------------------------------------- */
  /* URL sync                                                          */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', String(pageNum))
    if (selectedWordId) url.searchParams.set('word', selectedWordId)
    else url.searchParams.delete('word')
    window.history.replaceState({ page: pageNum, word: selectedWordId }, '', url)
  }, [pageNum, selectedWordId])

  /* ---------------------------------------------------------------- */
  /* navigation                                                        */
  /* ---------------------------------------------------------------- */
  const goToPage = useCallback((target: number, wordId?: string | null) => {
    const next = clamp(target, 1, 604)
    setDirection(next >= pageNum ? 'next' : 'prev')
    setPageNum(next)
    setLemmaFocus(null)
    setOccFilter('form')
    if (wordId) {
      setSelectedWordId(wordId)
      setPanelTab('meaning')
    } else if (next !== pageNum) {
      setSelectedWordId(null)
    }
  }, [pageNum])

  const openWord = useCallback((wordId: string, targetPage: number, tab: PanelTab = 'meaning') => {
    const next = clamp(targetPage, 1, 604)
    setDirection(next >= pageNum ? 'next' : 'prev')
    if (next !== pageNum) setPageNum(next)
    setSelectedWordId(wordId)
    setPanelTab(tab)
    setOccFilter('form')
    setLemmaFocus(null)
  }, [pageNum])

  const closePanel = useCallback(() => {
    setSelectedWordId(null)
    setLemmaFocus(null)
    setOccFilter('form')
  }, [])

  const goNext = useCallback(() => {
    if (pageNum < 604) goToPage(pageNum + 1)
  }, [goToPage, pageNum])

  const goPrev = useCallback(() => {
    if (pageNum > 1) goToPage(pageNum - 1)
  }, [goToPage, pageNum])

  const toggleBookmark = useCallback(() => {
    const exists = bookmarks.some((b) => b.page === pageNum)
    if (exists) {
      setBookmarks(bookmarks.filter((b) => b.page !== pageNum))
      pushToast(`Bookmark removed from page ${pageNum}`)
    } else {
      setBookmarks([...bookmarks, { page: pageNum, ts: Date.now() }])
      pushToast(`Page ${pageNum} bookmarked`)
    }
  }, [bookmarks, pageNum, setBookmarks, pushToast])

  /* ---------------------------------------------------------------- */
  /* global keyboard                                                   */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        return
      }
      if (e.key === 'Escape') {
        if (searchOpen) { setSearchOpen(false); return }
        if (settingsOpen) { setSettingsOpen(false); return }
        if (bookmarksOpen) { setBookmarksOpen(false); return }
        if (aboutOpen) { setAboutOpen(false); return }
        if (grammarGuideOpen) { setGrammarGuideOpen(false); return }
        if (selectedWordId) { closePanel(); return }
      }
      if (typing || searchOpen || settingsOpen || bookmarksOpen || aboutOpen || grammarGuideOpen) return
      if (e.key === 'ArrowLeft' || e.key === 'PageDown') { e.preventDefault(); goNext() }
      else if (e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); goPrev() }
      else if (e.key === '/') { e.preventDefault(); setSearchOpen(true) }
      else if (e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleBookmark()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goNext, goPrev, selectedWordId, closePanel, searchOpen, settingsOpen, bookmarksOpen, aboutOpen, grammarGuideOpen, pageNum, bookmarks])

  /* ---------------------------------------------------------------- */
  /* derived                                                           */
  /* ---------------------------------------------------------------- */
  const pageWords = useMemo(
    () => (page?.lines.flatMap((l) => l.w ?? []).filter(isSegment) ?? []) as Word[],
    [page],
  )
  const selectedWord = useMemo(
    () => (selectedWordId ? pageWords.find((w) => w.i === selectedWordId) ?? null : null),
    [pageWords, selectedWordId],
  )
  const lemma = selectedWord?.l !== undefined ? lexicon?.lemmaById.get(selectedWord.l) : undefined
  const root = selectedWord?.r !== undefined ? lexicon?.rootById.get(selectedWord.r) : undefined
  const isBookmarked = bookmarks.some((b) => b.page === pageNum)
  const showSkeleton = (!meta && !metaError) || loadingPage || !page || page.p !== pageNum

  const openOccurrences = useCallback((filter: OccFilter, lemmaId?: number | null) => {
    setPanelTab('occurrences')
    setOccFilter(filter)
    setLemmaFocus(lemmaId ?? null)
  }, [])

  /* ---------------------------------------------------------------- */
  /* body scroll lock for mobile sheet                                 */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    document.body.classList.toggle('panel-open', !!selectedWord)
    return () => document.body.classList.remove('panel-open')
  }, [selectedWord])

  /* ---------------------------------------------------------------- */
  /* swipe                                                             */
  /* ---------------------------------------------------------------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    swipeStart.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.4) return
    if (dx < 0) goNext()
    else goPrev()
  }

  const chapterNames = (page?.surahs ?? [])
    .map((s) => meta?.chapters.find((c) => c.id === s)?.name)
    .filter(Boolean)

  return (
    <div className={`app ${selectedWord && !isMobile ? 'has-panel' : ''}`}>
      <Header
        meta={meta}
        page={page}
        pageNum={pageNum}
        onGoPage={goToPage}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenBookmarks={() => setBookmarksOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        isBookmarked={isBookmarked}
        onToggleBookmark={toggleBookmark}
        resolvedTheme={resolved}
        onToggleTheme={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
      />

      <main className="workspace">
        <div className="page-stage">
          {!hintDismissed ? (
            <div className="reading-hint">
              <Sparkles size={15} />
              <span>Tap any word to see its meaning, root, derived words, grammar and every other use in the Qur'an.</span>
              <button className="hint-close" onClick={() => setHintDismissed(true)} aria-label="Dismiss hint">
                <X size={14} />
              </button>
            </div>
          ) : null}

          {metaError ? (
            <div className="notice-error">The mushaf metadata could not be loaded. Sūrah names and page information may be missing.</div>
          ) : null}

          <div
            className="page-canvas"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { swipeStart.current = null }}
          >
            <button
              className="page-turn page-turn-prev"
              onClick={goPrev}
              disabled={pageNum <= 1}
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronRight size={22} />
            </button>

            {showSkeleton ? <PageSkeleton /> : pageError ? (
              <PageError message={pageError} onRetry={() => setReloadToken((n) => n + 1)} />
            ) : (
              <div className={`page-anim ${direction}`} key={page.p}>
                <PageView
                  page={page}
                  meta={meta}
                  selectedWordId={selectedWordId}
                  onWordClick={(word) => {
                    setSelectedWordId(word.i)
                    setPanelTab('meaning')
                    setOccFilter('form')
                    setLemmaFocus(null)
                  }}
                  fontScale={fontScale}
                />
              </div>
            )}

            <button
              className="page-turn page-turn-next"
              onClick={goNext}
              disabled={pageNum >= 604}
              aria-label="Next page"
              title="Next page"
            >
              <ChevronLeft size={22} />
            </button>
          </div>

          <div className="page-meta-strip">
            <div className="page-meta-left">
              <span className="meta-pill">Juz {page?.juz ?? '—'}</span>
              <span className="meta-pill">Hizb {page?.hizb ?? '—'}</span>
              {chapterNames.length ? <span className="meta-surah">{chapterNames.join(' · ')}</span> : null}
              {page?.sajdah ? <span className="meta-pill sajdah-pill">Sajdah</span> : null}
            </div>
            <div className="page-meta-right">
              <span>Page {pageNum} of 604</span>
            </div>
          </div>

          <footer className="site-foot">
            <span className="foot-brand">Mushaf al-Madīnah</span>
            <span className="foot-sep">·</span>
            <span>Uthmani text and word glosses from Quran.com</span>
            <span className="foot-sep">·</span>
            <span>Morphology from the Quranic Arabic Corpus</span>
            <span className="foot-sep">·</span>
            <button className="text-link" onClick={() => setAboutOpen(true)}>
              <Info size={12} /> Sources & licence
            </button>
          </footer>
        </div>
      </main>

      {selectedWord && meta && page ? (
        <>
          <div className="panel-backdrop" onClick={closePanel} aria-hidden="true" />
          <WordPanel
            word={selectedWord}
            page={page}
            meta={meta}
            lexicon={lexicon}
            tab={panelTab}
            onTabChange={setPanelTab}
            onClose={closePanel}
            onNavigate={(wordId, targetPage) => openWord(wordId, targetPage, 'meaning')}
            onOpenOccurrences={openOccurrences}
            occFilter={occFilter}
            lemmaFocus={lemmaFocus}
            onClearLemmaFocus={() => setLemmaFocus(null)}
            onOpenGrammarGuide={() => setGrammarGuideOpen(true)}
            onToast={pushToast}
            mobile={isMobile}
            showTranslit={showTranslit}
            lemma={lemma}
            root={root}
          />
        </>
      ) : null}

      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        meta={meta}
        lexicon={lexicon}
        onGoPage={goToPage}
        onOpenWord={openWord}
      />

      <SettingsPopover
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        setTheme={setTheme}
        fontScale={fontScale}
        setFontScale={setFontScale}
        showTranslit={showTranslit}
        setShowTranslit={setShowTranslit}
      />

      <BookmarksDialog
        open={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
        bookmarks={bookmarks}
        meta={meta}
        onGoPage={(n) => { setBookmarksOpen(false); goToPage(n) }}
        onRemove={(n) => setBookmarks((prev) => prev.filter((b) => b.page !== n))}
        onClear={() => setBookmarks([])}
      />

      <GrammarGuideDialog open={grammarGuideOpen} onClose={() => setGrammarGuideOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} meta={meta} />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
