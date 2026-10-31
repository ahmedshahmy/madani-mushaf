import { BookOpenCheck, GraduationCap, Info } from 'lucide-react'
import type { Lemma, Root, Word } from '../../types'
import { buildGrammar } from '../../lib/grammar'

interface GrammarTabProps {
  word: Word
  lemma?: Lemma
  root?: Root
  onOpenGrammarGuide: () => void
}

export function GrammarTab({ word, lemma, root, onOpenGrammarGuide }: GrammarTabProps) {
  const g = buildGrammar(word, lemma, root)

  return (
    <div className="tab-stack">
      <section className="grammar-summary">
        <div className="grammar-summary-top">
          <span className="card-eyebrow">Grammatical profile</span>
          <span className="grammar-pos">{g.posLabel}</span>
        </div>
        <p className="irab">{g.irab}</p>
        <div className="chip-row">
          {g.chips.map((c) => (
            <span className={`gchip gchip-${c.kind}`} key={`${c.kind}-${c.label}`}>{c.label}</span>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="section-head compact">
          <div>
            <div className="card-eyebrow">Morphology</div>
            <h3>How the word is built</h3>
          </div>
          <GraduationCap size={18} className="muted-icon" />
        </div>
        <div className="segment-stack">
          {g.segments.map((seg, i) => (
            <div className={`segment-card role-${seg.role}`} key={`${seg.text}-${i}`}>
              <div className="segment-side">
                <span className="segment-role">{seg.roleLabel}</span>
                <span className="segment-pos">{seg.posLabel}</span>
              </div>
              <div className="segment-main">
                <div className="segment-ar" dir="rtl">{seg.text}</div>
                {seg.chips.length ? (
                  <div className="chip-row tight">
                    {seg.chips.map((c) => (
                      <span className={`gchip gchip-${c.kind}`} key={`${c.kind}-${c.label}`}>{c.label}</span>
                    ))}
                  </div>
                ) : null}
                {seg.note ? <p className="segment-note">{seg.note}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rules-section">
        <div className="section-head">
          <div>
            <div className="card-eyebrow">Grammar rules at work</div>
            <h3>Why this form?</h3>
          </div>
          <span className="section-count">{g.rules.length}</span>
        </div>
        <div className="rule-list">
          {g.rules.map((rule) => (
            <article className={`rule-card rule-${rule.kind}`} key={rule.id}>
              <div className="rule-head">
                <h4>{rule.title}</h4>
                {rule.term ? <span className="rule-term">{rule.term}</span> : null}
              </div>
              <p>{rule.body}</p>
            </article>
          ))}
          {!g.rules.length ? (
            <div className="panel-card gentle-card">
              <p>This word is a function word. Its grammatical work is shown in the morphology section above.</p>
            </div>
          ) : null}
        </div>
        <button className="btn btn-ghost grammar-guide-btn" onClick={onOpenGrammarGuide}>
          <BookOpenCheck size={16} />
          Open the grammar guide
        </button>
      </section>

      <div className="source-inline">
        <Info size={13} />
        <span>
          Morphology: Quranic Arabic Corpus (GPL). Grammar notes are generated from the corpus features and are for learning;
          they are not a substitute for tafsīr or a teacher.
        </span>
      </div>
    </div>
  )
}
