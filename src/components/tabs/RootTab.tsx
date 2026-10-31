import { useEffect, useState } from 'react'
import { ArrowUpRight, Loader2, Sprout } from 'lucide-react'
import type { Lemma, OccFilter, Root, RootDetail, Word } from '../../types'
import { loadRoot } from '../../lib/data'
import { formatNumber, prettyArabic, stripPauseMarks } from '../../lib/format'

interface RootTabProps {
  word: Word
  lemma?: Lemma
  root?: Root
  onOpenOccurrences: (filter: OccFilter, lemmaId?: number | null) => void
}

export function RootTab({ word, lemma, root, onOpenOccurrences }: RootTabProps) {
  const [detail, setDetail] = useState<RootDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setDetail(null)
    setError(null)
    if (word.r === undefined) return
    loadRoot(word.r)
      .then((data) => { if (alive) setDetail(data) })
      .catch((err) => { if (alive) setError(err instanceof Error ? err.message : 'Could not load root') })
    return () => { alive = false }
  }, [word.r])

  if (word.r !== undefined && !root) {
    return (
      <div className="tab-stack">
        <div className="derivation-loading">
          <Loader2 size={18} className="spin" />
          <span>Loading the root…</span>
        </div>
      </div>
    )
  }

  if (word.r === undefined || !root) {
    return (
      <div className="tab-stack">
        <section className="panel-card empty-card">
          <div className="empty-icon"><Sprout size={22} /></div>
          <h3>No triliteral root</h3>
          <p>
            This word is a particle, pronoun, or other function word, so the corpus does not assign it a
            consonantal root. Its dictionary entry and all its uses are still available.
          </p>
          {lemma ? (
            <button className="btn btn-primary" onClick={() => onOpenOccurrences('lemma')}>
              See {formatNumber(lemma.count)} use{lemma.count === 1 ? '' : 's'} of {lemma.plain}
            </button>
          ) : null}
        </section>
      </div>
    )
  }

  return (
    <div className="tab-stack">
      <section className="root-hero">
        <div className="root-hero-top">
          <span className="card-eyebrow">Arabic root</span>
          <span className="root-translit">{root.tr}</span>
        </div>
        <div className="root-letters" dir="rtl">
          {root.ar.split('').map((letter, i) => (
            <span className="root-letter" key={`${letter}-${i}`}>{letter}</span>
          ))}
        </div>
        <div className="root-stats">
          <div><b>{formatNumber(root.count)}</b><span>occurrences</span></div>
          <div><b>{detail ? detail.lemmas.length : '—'}</b><span>derived words</span></div>
          <div><b dir="rtl" className="stat-ar">{root.ar}</b><span>root letters</span></div>
        </div>
      </section>

      {detail?.senses?.length ? (
        <section className="panel-card">
          <div className="card-eyebrow">Core senses across the Qur'an</div>
          <div className="sense-chips">
            {detail.senses.slice(0, 6).map((s) => <span className="sense-chip" key={s}>{s}</span>)}
          </div>
          <p className="fine-note">These are the most frequent glosses of words built on this root, not a dictionary definition of the root itself.</p>
        </section>
      ) : null}

      <section className="derivations-section">
        <div className="section-head">
          <div>
            <div className="card-eyebrow">Derived words</div>
            <h3>From this root</h3>
          </div>
          <span className="section-count">{detail ? detail.lemmas.length : '…'}</span>
        </div>

        {error ? <div className="inline-error">{error}</div> : null}
        {!detail && !error ? (
          <div className="derivation-loading">
            <Loader2 size={18} className="spin" />
            <span>Loading the root family…</span>
          </div>
        ) : null}

        <div className="derivation-list">
          {detail?.lemmas.map((d) => (
            <button
              className={`derivation-card ${d.id === word.l ? 'is-current' : ''}`}
              key={d.id}
              onClick={() => onOpenOccurrences('lemma', d.id)}
            >
              <div className="derivation-top">
                <span className="derivation-ar" dir="rtl">{prettyArabic(d.ar)}</span>
                <span className="derivation-count">{formatNumber(d.count)}×</span>
              </div>
              <div className="derivation-type">{d.type}</div>
              <div className="derivation-gloss">{d.gloss}</div>
              {d.forms.length ? (
                <div className="derivation-forms" dir="rtl">
                  {d.forms.slice(0, 3).map(([form, count]) => (
                    <span className="form-chip" key={form} title={`${count} occurrence${count === 1 ? '' : 's'}`}>
                      {stripPauseMarks(prettyArabic(form))}
                      <em>{count}</em>
                    </span>
                  ))}
                </div>
              ) : null}
              <span className="derivation-link">View occurrences <ArrowUpRight size={12} /></span>
            </button>
          ))}
        </div>
      </section>

      <p className="fine-note source-note">
        Root and lemma grouping from the Quranic Arabic Corpus morphology (v0.4).
      </p>
    </div>
  )
}
