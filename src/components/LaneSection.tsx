import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, BookOpenText, ExternalLink, Loader2 } from 'lucide-react'
import type { LaneEntry } from '../types'

interface LaneSectionProps {
  entry: LaneEntry
  loading: boolean
  error: string | null
}

function pageLabel(entry: LaneEntry): string {
  const pages = entry.pages
  if (!pages) return ''
  return pages[0] === pages[1] ? `p. ${pages[0]}` : `pp. ${pages[0]}–${pages[1]}`
}

export function LaneSection({ entry, loading, error }: LaneSectionProps) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => { setExpanded(false) }, [entry.id])

  if (loading) {
    return (
      <section className="lane-card lane-loading" aria-busy="true">
        <div className="lane-head">
          <div>
            <div className="card-eyebrow">Lane's Lexicon · 1863</div>
            <h3>Classical dictionary entry</h3>
          </div>
          <Loader2 size={16} className="spin muted-icon" />
        </div>
        <div className="lane-skeleton">
          <span className="skeleton-line" />
          <span className="skeleton-line short" />
          <span className="skeleton-line" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="lane-card">
        <div className="card-eyebrow">Lane's Lexicon · 1863</div>
        <p className="lane-empty">{error}</p>
      </section>
    )
  }

  if (!entry.found) {
    return (
      <section className="lane-card">
        <div className="lane-head">
          <div>
            <div className="card-eyebrow">Lane's Lexicon · 1863</div>
            <h3>Classical dictionary entry</h3>
          </div>
        </div>
        <p className="lane-empty">
          No Lane entry is mapped for this root. The printed lexicon does not give every rare
          root a separate article, or the digital text does not contain one.
        </p>
      </section>
    )
  }

  const isLong = entry.html.length > 1400

  return (
    <section className={`lane-card ${expanded ? 'is-expanded' : ''}`}>
      <div className="lane-head">
        <div>
          <div className="card-eyebrow">Lane's Lexicon · 1863</div>
          <h3>Classical dictionary entry</h3>
        </div>
        {entry.pages ? <span className="lane-pages">{pageLabel(entry)}</span> : null}
      </div>

      {entry.match === 'parent' ? (
        <p className="lane-match">
          Lane groups this root under the parent article <b>{entry.key}</b>. The nearest article is shown below.
        </p>
      ) : null}

      <div className="lane-body-wrap">
        <div
          className={`lane-body ${expanded ? 'is-expanded' : ''}`}
          dangerouslySetInnerHTML={{ __html: entry.html }}
        />
        {!expanded && isLong ? <div className="lane-fade" aria-hidden="true" /> : null}
      </div>

      {isLong ? (
        <button
          className="btn btn-ghost lane-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {expanded ? 'Collapse the entry' : 'Read the full entry'}
        </button>
      ) : null}

      {entry.truncated ? (
        <p className="fine-note">
          This is a long article. The panel shows the first {entry.shownEntries} of {entry.entries} entries
          {entry.pages ? ` (Lane ${pageLabel(entry)})` : ''}.
        </p>
      ) : null}

      <p className="fine-note lane-source">
        <BookOpenText size={12} />
        <span>
          Public-domain Lane entry digitized by the{' '}
          <a
            href="https://www.perseus.tufts.edu/hopper/collection?collection=Perseus:corpus:perseus,work,Lane,%20An%20Arabic-English%20Lexicon"
            target="_blank"
            rel="noreferrer"
          >
            Perseus Digital Library <ExternalLink size={10} />
          </a>
          . Arabic transliteration is rendered in Arabic script; 19th-century English and abbreviations are retained.
        </span>
      </p>
    </section>
  )
}
