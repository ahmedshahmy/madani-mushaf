import { ExternalLink, Heart, X } from 'lucide-react'
import type { Meta } from '../types'

export function AboutDialog({ open, onClose, meta }: { open: boolean; onClose: () => void; meta: Meta | null }) {
  if (!open) return null
  return (
    <div className="overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal about-modal" role="dialog" aria-modal="true" aria-label="About this mushaf">
        <div className="modal-head">
          <div>
            <span className="card-eyebrow">About</span>
            <h2>Mushaf al-Madīnah</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close about"><X size={18} /></button>
        </div>

        <p className="modal-intro">
          A quiet, word-by-word reading of the 604-page Madanī Mushaf. Tap any word to see its English
          meaning, its Arabic root and derived words, the grammar at work, and every other place the
          word appears in the Qur'an.
        </p>

        <div className="about-stats">
          <div><b>{meta?.pageCount ?? 604}</b><span>pages</span></div>
          <div><b>{meta?.wordCount?.toLocaleString() ?? '77,429'}</b><span>words</span></div>
          <div><b>{meta?.rootCount?.toLocaleString() ?? '1,642'}</b><span>roots</span></div>
          <div><b>{meta?.lemmaCount?.toLocaleString() ?? '4,864'}</b><span>lemmas</span></div>
        </div>

        <section className="about-section">
          <h3>Sources & attribution</h3>
          <ul className="source-list">
            <li>
              <a href="https://corpus.quran.com" target="_blank" rel="noreferrer">
                Quranic Arabic Corpus <ExternalLink size={12} />
              </a>
              <span>Morphology, lemmas, roots and grammatical features. © Kais Dukes, University of Leeds. GNU GPL. Used with attribution.</span>
            </li>
            <li>
              <a href="https://quran.com" target="_blank" rel="noreferrer">
                Quran.com <ExternalLink size={12} />
              </a>
              <span>Uthmani text, word-by-word English glosses, transliterations and the Saheeh International verse translation.</span>
            </li>
            <li>
              <a href="https://tanzil.net" target="_blank" rel="noreferrer">
                Tanzil Quran Text <ExternalLink size={12} />
              </a>
              <span>The verified Uthmani text underlying the corpus. CC BY-ND 3.0; reproduced verbatim.</span>
            </li>
            <li>
              <a href="https://github.com/blueheron786/quranic-universal-library-mushaf-layouts" target="_blank" rel="noreferrer">
                QUL 15-line Madani layout <ExternalLink size={12} />
              </a>
              <span>Line structure of the 604-page Madanī Mushaf; Quran.com’s explicit page/line fields place each word.</span>
            </li>
            <li>
              <span className="font-credit">Scheherazade New (SIL OFL), Noto Naskh Arabic (SIL OFL) and Outfit (SIL OFL) fonts.</span>
            </li>
          </ul>
        </section>

        <section className="about-section">
          <h3>How the data is built</h3>
          <p>
            Every one of the 77,429 words is aligned with the Quranic Arabic Corpus morphology by
            sūrah, verse and word position. Roots, lemmas, segments and features are reorganised into
            small JSON files; occurrences are grouped by root and lemma. Grammar explanations are
            generated from the corpus features, not from a tafsīr.
          </p>
        </section>

        <section className="about-section">
          <h3>A note on meaning</h3>
          <p>
            Word glosses are brief guides, not complete definitions; an Arabic word can carry several
            senses in different contexts. Grammar notes are for learning and may simplify a rich
            scholarly discussion. For tafsīr and rulings, consult qualified teachers and scholars.
          </p>
        </section>

        <div className="about-foot">
          <a href="https://github.com/ahmedshahmy/madani-mushaf" target="_blank" rel="noreferrer">
            Source code on GitHub <ExternalLink size={13} />
          </a>
          <span>Licensed GPL-3.0 · data licences are described in NOTICE.md</span>
          <span className="made-with">Built with care <Heart size={12} /></span>
        </div>
      </div>
    </div>
  )
}
