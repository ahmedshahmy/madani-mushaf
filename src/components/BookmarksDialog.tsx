import { Bookmark, Trash2, X } from 'lucide-react'
import type { Meta } from '../types'
import { relativeTime } from '../lib/format'

export interface BookmarkEntry { page: number; ts: number }

interface BookmarksDialogProps {
  open: boolean
  onClose: () => void
  bookmarks: BookmarkEntry[]
  meta: Meta | null
  onGoPage: (n: number) => void
  onRemove: (page: number) => void
  onClear: () => void
}

export function BookmarksDialog({ open, onClose, bookmarks, meta, onGoPage, onRemove, onClear }: BookmarksDialogProps) {
  if (!open) return null
  const sorted = [...bookmarks].sort((a, b) => b.ts - a.ts)
  return (
    <div className="overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal bookmarks-modal" role="dialog" aria-modal="true" aria-label="Bookmarks">
        <div className="modal-head">
          <div>
            <span className="card-eyebrow">Your reading</span>
            <h2>Bookmarks</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close bookmarks"><X size={18} /></button>
        </div>

        {sorted.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon"><Bookmark size={22} /></div>
            <h3>No bookmarks yet</h3>
            <p>Use the bookmark button in the header to save the page you are reading.</p>
          </div>
        ) : (
          <>
            <div className="bookmark-list">
              {sorted.map((b) => {
                const chapter = meta?.chapters.find((c) => b.page >= c.start && b.page <= c.end)
                return (
                  <div className="bookmark-row" key={b.page}>
                    <button className="bookmark-main" onClick={() => { onGoPage(b.page); onClose() }}>
                      <span className="bookmark-page">{b.page}</span>
                      <span className="bookmark-body">
                        <span className="bookmark-title">{chapter ? `${chapter.name} · ${chapter.en}` : 'Madani Mushaf'}</span>
                        <span className="bookmark-sub">Page {b.page} · saved {relativeTime(b.ts)}</span>
                      </span>
                    </button>
                    <button className="icon-btn" onClick={() => onRemove(b.page)} aria-label={`Remove bookmark for page ${b.page}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
            <button className="btn btn-ghost clear-bookmarks" onClick={onClear}>
              <Trash2 size={14} /> Clear all bookmarks
            </button>
          </>
        )}
      </div>
    </div>
  )
}
