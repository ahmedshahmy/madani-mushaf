import { X } from 'lucide-react'
import { GRAMMAR_GUIDE } from '../lib/grammar'

export function GrammarGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal guide-modal" role="dialog" aria-modal="true" aria-label="Grammar guide">
        <div className="modal-head">
          <div>
            <span className="card-eyebrow">A short reference</span>
            <h2>Qur'anic grammar guide</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close grammar guide"><X size={18} /></button>
        </div>
        <p className="modal-intro">
          These are the terms used in the word panels. The notes follow the traditional Arabic grammar
          (iʿrāb) used by the Quranic Arabic Corpus.
        </p>
        <div className="guide-grid">
          {GRAMMAR_GUIDE.map((g) => (
            <article className="guide-card" key={g.term}>
              <div className="guide-term">
                <h3>{g.term}</h3>
                <span dir="rtl">{g.arabic}</span>
              </div>
              <p>{g.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
