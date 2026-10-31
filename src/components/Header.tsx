import { useEffect, useMemo, useState } from 'react'
import {
  Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Info, Library, Moon, Search,
  Settings2, Sun,
} from 'lucide-react'
import type { Meta, PageData } from '../types'
import { clamp } from '../lib/format'
import { Logo } from './Logo'

interface HeaderProps {
  meta: Meta | null
  page: PageData | null
  pageNum: number
  onGoPage: (n: number) => void
  onOpenSearch: () => void
  onOpenSettings: () => void
  onOpenBookmarks: () => void
  onOpenAbout: () => void
  isBookmarked: boolean
  onToggleBookmark: () => void
  resolvedTheme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({
  meta, page, pageNum, onGoPage, onOpenSearch, onOpenSettings, onOpenBookmarks,
  onOpenAbout, isBookmarked, onToggleBookmark, resolvedTheme, onToggleTheme,
}: HeaderProps) {
  const [pageInput, setPageInput] = useState(String(pageNum))

  useEffect(() => setPageInput(String(pageNum)), [pageNum])

  const currentChapter = useMemo(() => {
    if (!meta) return null
    if (page?.surahs.length) {
      return meta.chapters.find((c) => c.id === page.surahs[0]) ?? null
    }
    return meta.chapters.find((c) => pageNum >= c.start && pageNum <= c.end) ?? null
  }, [meta, page, pageNum])

  const currentJuz = useMemo(() => {
    if (!meta) return 1
    if (page?.juz) return page.juz
    let j = 1
    for (const item of meta.juzs) if (pageNum >= item.start) j = item.id
    return j
  }, [meta, page, pageNum])

  const commitPage = () => {
    const n = parseInt(pageInput.replace(/[^\d]/g, ''), 10)
    if (Number.isFinite(n)) onGoPage(clamp(n, 1, meta?.pageCount ?? 604))
    else setPageInput(String(pageNum))
  }

  return (
    <header className="app-header">
      <div className="header-main">
        <button className="brand" onClick={() => onGoPage(1)} aria-label="Go to the first page">
          <Logo />
          <span className="brand-text">
            <span className="brand-title">Mushaf al-Madīnah</span>
            <span className="brand-sub">Word by word · 604 pages</span>
          </span>
        </button>

        <div className="header-nav">
          <label className="select-wrap">
            <span className="select-label">Sūrah</span>
            <select
              value={currentChapter?.id ?? ''}
              onChange={(e) => {
                const c = meta?.chapters.find((x) => x.id === Number(e.target.value))
                if (c) onGoPage(c.start)
              }}
              aria-label="Choose a sūrah"
            >
              {(meta?.chapters ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.id}. {c.name}</option>
              ))}
            </select>
          </label>

          <label className="select-wrap juz-select">
            <span className="select-label">Juz</span>
            <select
              value={currentJuz}
              onChange={(e) => {
                const j = meta?.juzs.find((x) => x.id === Number(e.target.value))
                if (j) onGoPage(j.start)
              }}
              aria-label="Choose a juz"
            >
              {(meta?.juzs ?? []).map((j) => (
                <option key={j.id} value={j.id}>Juz {j.id}</option>
              ))}
            </select>
          </label>

          <div className="page-stepper" aria-label="Page navigation">
            <button
              className="icon-btn"
              onClick={() => onGoPage(clamp(pageNum - 1, 1, meta?.pageCount ?? 604))}
              disabled={pageNum <= 1}
              aria-label="Previous page"
              title="Previous page (→)"
            >
              <ChevronLeft size={18} />
            </button>
            <label className="page-input-wrap">
              <span className="sr-only">Page number</span>
              <input
                value={pageInput}
                inputMode="numeric"
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={commitPage}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.currentTarget.blur() }
                  if (e.key === 'Escape') { setPageInput(String(pageNum)); e.currentTarget.blur() }
                }}
                aria-label="Page number"
              />
              <span className="page-total">/ {meta?.pageCount ?? 604}</span>
            </label>
            <button
              className="icon-btn"
              onClick={() => onGoPage(clamp(pageNum + 1, 1, meta?.pageCount ?? 604))}
              disabled={pageNum >= (meta?.pageCount ?? 604)}
              aria-label="Next page"
              title="Next page (←)"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="header-actions">
          <button className="search-trigger" onClick={onOpenSearch} aria-label="Search the Qur'an">
            <Search size={17} />
            <span className="search-trigger-label">Search</span>
            <kbd>⌘K</kbd>
          </button>
          <button
            className={`icon-btn ${isBookmarked ? 'is-active' : ''}`}
            onClick={onToggleBookmark}
            aria-label={isBookmarked ? 'Remove page bookmark' : 'Bookmark this page'}
            title="Bookmark this page"
          >
            {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
          <button className="icon-btn" onClick={onOpenBookmarks} aria-label="Open bookmarks" title="Bookmarks">
            <Library size={17} />
          </button>
          <button className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme" title="Toggle light / dark">
            {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-btn" onClick={onOpenSettings} aria-label="Reading settings" title="Reading settings">
            <Settings2 size={18} />
          </button>
          <button className="icon-btn hide-mobile" onClick={onOpenAbout} aria-label="About and sources" title="About & sources">
            <Info size={18} />
          </button>
        </div>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${(pageNum / (meta?.pageCount ?? 604)) * 100}%` }} />
      </div>
    </header>
  )
}
