import type { Lemma, Root, Segment, Word } from '../types'

export type ChipKind =
  | 'pos' | 'form' | 'tense' | 'voice' | 'case' | 'gender' | 'number'
  | 'definite' | 'derived' | 'mood' | 'person' | 'particle' | 'pronoun' | 'other'

export interface GrammarChip {
  label: string
  kind: ChipKind
}

export interface SegmentView {
  text: string
  pos: string
  role: Segment[2]
  roleLabel: string
  posLabel: string
  chips: GrammarChip[]
  note?: string
}

export interface RuleView {
  id: string
  title: string
  body: string
  term?: string
  kind: ChipKind
}

export interface GrammarView {
  posLabel: string
  summary: string
  irab: string
  chips: GrammarChip[]
  segments: SegmentView[]
  rules: RuleView[]
}

const POS: Record<string, string> = {
  N: 'Noun', PN: 'Proper noun', ADJ: 'Adjective', IMPN: 'Imperative verbal noun',
  PRON: 'Personal pronoun', DEM: 'Demonstrative pronoun', REL: 'Relative pronoun',
  T: 'Time adverb', LOC: 'Location adverb', V: 'Verb', P: 'Preposition',
  EMPH: 'Emphatic lām', IMPV: 'Imperative lām', PRP: 'Purpose lām',
  CONJ: 'Conjunction', SUB: 'Subordinating conjunction', ACC: 'Accusative particle',
  AMD: 'Amendment particle', ANS: 'Answer particle', AVR: 'Aversion particle',
  CAUS: 'Particle of cause', CERT: 'Particle of certainty', CIRC: 'Circumstantial particle',
  COM: 'Comitative particle', COND: 'Conditional particle', EQ: 'Equalization particle',
  EXH: 'Exhortation particle', EXL: 'Explanation particle', EXP: 'Exceptive particle',
  FUT: 'Future particle', INC: 'Inceptive particle', INT: 'Particle of interpretation',
  INTG: 'Interrogative particle', NEG: 'Negative particle', PREV: 'Preventive particle',
  PRO: 'Prohibition particle', REM: 'Resumption particle', RES: 'Restriction particle',
  RET: 'Retraction particle', RSLT: 'Result particle', SUP: 'Supplemental particle',
  SUR: 'Surprise particle', VOC: 'Vocative particle', INL: 'Quranic initials',
  DET: 'Definite article',
}

const GEN: Record<string, string> = {
  M: 'Masculine', F: 'Feminine', S: 'Singular', D: 'Dual', P: 'Plural',
  NOM: 'Nominative', ACC: 'Accusative', GEN: 'Genitive', INDEF: 'Indefinite',
  PERF: 'Perfect', IMPF: 'Imperfect', IMPV: 'Imperative', PASS: 'Passive',
  ACT: 'Active', PCPL: 'Participle', VN: 'Verbal noun',
  'MOOD:IND': 'Indicative', 'MOOD:SUBJ': 'Subjunctive', 'MOOD:JUS': 'Jussive',
}

const FORM_RE = /^\((I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\)$/

export function isSegment(item: unknown): item is Word {
  return !!item && typeof item === 'object' && 'i' in (item as Record<string, unknown>)
}

export function posLabel(pos: string): string {
  return POS[pos] ?? pos ?? 'Particle'
}

function formOf(feats: Iterable<string>): string | null {
  for (const f of feats) {
    const m = FORM_RE.exec(f)
    if (m) return m[1]
  }
  return null
}

function has(feats: Iterable<string>, value: string) {
  for (const f of feats) if (f === value) return true
  return false
}

interface PersonInfo {
  person: string
  gender?: string
  number: string
  label: string
  code: string
}

function personInfo(code: string | undefined): PersonInfo | null {
  if (!code) return null
  const m = /^([123])(M|F)?([SDP])$/.exec(code)
  if (!m) return null
  const person = m[1] === '1' ? '1st' : m[1] === '2' ? '2nd' : '3rd'
  const gender = m[2] === 'M' ? 'masculine' : m[2] === 'F' ? 'feminine' : undefined
  const number = m[3] === 'S' ? 'singular' : m[3] === 'D' ? 'dual' : 'plural'
  return {
    person, gender, number, code,
    label: `${person} person${gender ? ` ${gender}` : ''} ${number}`,
  }
}

function personFeature(feats: Iterable<string>): PersonInfo | null {
  for (const f of feats) {
    if (/^[123](M|F)?[SDP]$/.test(f)) return personInfo(f)
  }
  return null
}

const PREFIXES: Record<string, { label: string; short: string; meaning: string; note: string }> = {
  Al: { label: 'Definite article (al-)', short: 'al-', meaning: 'the', note: 'Makes the following noun definite. In connected speech the hamza of al- is elided.' },
  bi: { label: 'Preposition (bi-)', short: 'bi-', meaning: 'in, by, with', note: 'A preposition; the following noun is genitive (majrūr).' },
  ka: { label: 'Preposition (ka-)', short: 'ka-', meaning: 'like, as', note: 'A preposition; the following noun is genitive.' },
  ta: { label: 'Oath particle (ta-)', short: 'ta-', meaning: 'by (in an oath)', note: 'Used before the name of Allah in an oath.' },
  sa: { label: 'Future particle (sa-)', short: 'sa-', meaning: 'will, soon', note: 'Attaches to an imperfect verb and refers to the near future.' },
  ya: { label: 'Vocative particle (yā)', short: 'yā', meaning: 'O …', note: 'Calls or addresses someone.' },
  ha: { label: 'Vocative particle (hā)', short: 'hā', meaning: 'Lo! …', note: 'Calls or draws attention.' },
  'A:INTG': { label: 'Interrogative alif (a-)', short: 'a-', meaning: 'is? did? do?', note: 'Turns the statement into a question.' },
  'A:EQ': { label: 'Equalization alif (a-)', short: 'a-', meaning: 'whether', note: 'Introduces an equalized alternative.' },
  'w:CONJ': { label: 'Conjunction (wa-)', short: 'wa-', meaning: 'and', note: 'Coordinates the following word with what precedes it.' },
  'w:REM': { label: 'Resumption (wa-)', short: 'wa-', meaning: 'then, so', note: 'Marks a new sentence or a resumption of speech.' },
  'w:CIRC': { label: 'Circumstantial (wa-)', short: 'wa-', meaning: 'while', note: 'Introduces a circumstantial clause (ḥāl).' },
  'w:SUP': { label: 'Supplemental (wa-)', short: 'wa-', meaning: 'then, so', note: 'Adds a supplementary statement.' },
  'w:P': { label: 'Oath particle (wa-)', short: 'wa-', meaning: 'by', note: 'A preposition used in oaths; the following noun is genitive.' },
  'w:COM': { label: 'Comitative (wa-)', short: 'wa-', meaning: 'with', note: 'Means “together with”; the following noun is genitive.' },
  'f:CONJ': { label: 'Conjunction (fa-)', short: 'fa-', meaning: 'and, then', note: 'Connects and often implies sequence.' },
  'f:REM': { label: 'Resumption (fa-)', short: 'fa-', meaning: 'then, so', note: 'Resumes speech or introduces a new statement.' },
  'f:RSLT': { label: 'Result (fa-)', short: 'fa-', meaning: 'then, so', note: 'Introduces the result of what precedes.' },
  'f:SUP': { label: 'Supplemental (fa-)', short: 'fa-', meaning: 'then, so', note: 'Adds a supplementary statement.' },
  'f:CAUS': { label: 'Cause (fa-)', short: 'fa-', meaning: 'because, then', note: 'Introduces a cause or reason.' },
  'l:P': { label: 'Preposition (li-)', short: 'li-', meaning: 'for, to', note: 'A preposition; the following noun is genitive.' },
  'l:EMPH': { label: 'Emphatic lām', short: 'la-', meaning: 'indeed', note: 'Adds emphasis to the following word.' },
  'l:PRP': { label: 'Purpose lām', short: 'li-', meaning: 'in order to', note: 'Introduces purpose; often followed by a subjunctive verb.' },
  'l:IMPV': { label: 'Imperative lām', short: 'li-', meaning: 'let …', note: 'Used to form a command in the third person.' },
}

const PRONOUNS: Record<string, { short: string; meaning: string }> = {
  '1S': { short: '-nī / -yā', meaning: 'me / my' },
  '1P': { short: '-nā', meaning: 'us / our' },
  '2MS': { short: '-ka', meaning: 'you / your (m. sg.)' },
  '2FS': { short: '-ki', meaning: 'you / your (f. sg.)' },
  '2MP': { short: '-kum', meaning: 'you / your (m. pl.)' },
  '2FP': { short: '-kunna', meaning: 'you / your (f. pl.)' },
  '2D': { short: '-kumā', meaning: 'you two / your (dual)' },
  '2MD': { short: '-kumā', meaning: 'you two / your (m. dual)' },
  '2FD': { short: '-kumā', meaning: 'you two / your (f. dual)' },
  '3MS': { short: '-hu', meaning: 'him / his / it' },
  '3FS': { short: '-hā', meaning: 'her / hers / it' },
  '3MP': { short: '-hum', meaning: 'them / their (m. pl.)' },
  '3FP': { short: '-hunna', meaning: 'them / their (f. pl.)' },
  '3D': { short: '-humā', meaning: 'them two / their (dual)' },
  '3MD': { short: '-humā', meaning: 'them two / their (m. dual)' },
  '3FD': { short: '-humā', meaning: 'them two / their (f. dual)' },
}

const VERB_FORMS: Record<string, { title: string; body: string }> = {
  I: {
    title: 'Form I — the base verb',
    body: 'Form I is the plain, underived verb. Its meaning is the root’s basic sense, e.g. كَتَبَ “he wrote”.',
  },
  II: {
    title: 'Form II — intensifying or causative',
    body: 'Form II often intensifies the root meaning or makes it causative: e.g. عَلِمَ “he knew” → عَلَّمَ “he taught”.',
  },
  III: {
    title: 'Form III — directed action',
    body: 'Form III often expresses an action directed toward someone else, or a reciprocal action: e.g. كَاتَبَ “he wrote to / corresponded with”.',
  },
  IV: {
    title: 'Form IV — causative',
    body: 'Form IV commonly makes the verb causative: e.g. أَنْزَلَ “he sent down” from the root ن-ز-ل.',
  },
  V: {
    title: 'Form V — reflexive of Form II',
    body: 'Form V is typically the reflexive of Form II: the subject brings the action upon itself, e.g. تَعَلَّمَ “he learned”.',
  },
  VI: {
    title: 'Form VI — reciprocal of Form III',
    body: 'Form VI usually expresses mutual action between two parties, e.g. تَكَاتَبَ “they wrote to one another”.',
  },
  VII: {
    title: 'Form VII — reflexive / passive',
    body: 'Form VII often expresses an action done to or by the subject itself, e.g. اِنْكَسَرَ “it broke”.',
  },
  VIII: {
    title: 'Form VIII — reflexive',
    body: 'Form VIII commonly expresses a reflexive or self-directed action, e.g. اِكْتَتَبَ “he wrote down / enrolled”.',
  },
  IX: {
    title: 'Form IX — colours and defects',
    body: 'Form IX is rare and usually describes colours or physical defects, e.g. اِسْوَدَّ “it became black”.',
  },
  X: {
    title: 'Form X — seeking or deeming',
    body: 'Form X often means seeking, asking for, or deeming something, e.g. اِسْتَغْفَرَ “he sought forgiveness”.',
  },
  XI: { title: 'Form XI', body: 'A rare derived form, mostly associated with colours or states.' },
  XII: { title: 'Form XII', body: 'A rare derived form with an intensive or specialized sense.' },
}

function prefixCode(feats: string[]): string | null {
  for (const f of feats) if (PREFIXES[f]) return f
  return null
}

function pronounCode(feats: string[]): string | null {
  for (const f of feats) if (f.startsWith('PRON:')) return f.slice(5)
  return null
}

export function humanFeature(f: string): GrammarChip | null {
  if (!f) return null
  if (FORM_RE.test(f)) {
    const form = FORM_RE.exec(f)![1]
    return { label: `Form ${form}`, kind: 'form' }
  }
  if (f.startsWith('MOOD:')) {
    const label = GEN[f]
    return label ? { label, kind: 'mood' } : null
  }
  if (f.startsWith('PRON:')) {
    const code = f.slice(5)
    const info = personInfo(code)
    if (!info) return null
    return { label: `Pronoun ${info.label}`, kind: 'pronoun' }
  }
  if (PREFIXES[f]) return { label: PREFIXES[f].short, kind: 'particle' }
  const label = GEN[f]
  if (!label) return null
  let kind: ChipKind = 'other'
  if (['NOM', 'ACC', 'GEN'].includes(f)) kind = 'case'
  else if (['M', 'F'].includes(f)) kind = 'gender'
  else if (['S', 'D', 'P'].includes(f)) kind = 'number'
  else if (['PERF', 'IMPF', 'IMPV'].includes(f)) kind = 'tense'
  else if (['PASS', 'ACT'].includes(f)) kind = 'voice'
  else if (['PCPL', 'VN'].includes(f)) kind = 'derived'
  else if (f === 'INDEF') kind = 'definite'
  return { label, kind }
}

function uniqChips(chips: GrammarChip[]): GrammarChip[] {
  const seen = new Set<string>()
  return chips.filter((c) => {
    const key = `${c.kind}:${c.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildGrammar(word: Word, lemma?: Lemma | null, root?: Root | null): GrammarView {
  const feats = word.f ?? []
  const fset = new Set(feats)
  const p = word.p
  const pos = posLabel(p)
  const form = formOf(feats)
  const isVerb = p === 'V'
  const isNounish = ['N', 'ADJ', 'PN'].includes(p)
  const caseName = has(fset, 'NOM') ? 'Nominative' : has(fset, 'ACC') ? 'Accusative' : has(fset, 'GEN') ? 'Genitive' : null
  const gender = has(fset, 'M') ? 'masculine' : has(fset, 'F') ? 'feminine' : null
  const number = has(fset, 'S') ? 'singular' : has(fset, 'D') ? 'dual' : has(fset, 'P') ? 'plural' : null
  const person = personFeature(feats)
  const tense = has(fset, 'PERF') ? 'Perfect' : has(fset, 'IMPF') ? 'Imperfect' : has(fset, 'IMPV') ? 'Imperative' : null
  const passive = has(fset, 'PASS')
  const derived = has(fset, 'PCPL')
    ? has(fset, 'PASS') ? 'Passive participle' : 'Active participle'
    : has(fset, 'VN') ? 'Verbal noun' : null
  const mood = has(fset, 'MOOD:SUBJ') ? 'Subjunctive' : has(fset, 'MOOD:JUS') ? 'Jussive' : null
  const hasAl = !!(word.g ?? []).some((s) => s[3] === 'Al')
  const definite = hasAl || p === 'PN' || (isNounish && !has(fset, 'INDEF'))

  const chips: GrammarChip[] = [{ label: pos, kind: 'pos' }]
  if (isVerb) {
    chips.push({ label: `Form ${form ?? 'I'}`, kind: 'form' })
    if (tense) chips.push({ label: tense, kind: 'tense' })
    if (passive) chips.push({ label: 'Passive', kind: 'voice' })
    if (person) chips.push({ label: person.label, kind: 'person' })
    if (mood) chips.push({ label: mood, kind: 'mood' })
  } else {
    if (derived) chips.push({ label: derived, kind: 'derived' })
    if (gender) chips.push({ label: gender, kind: 'gender' })
    if (number) chips.push({ label: number, kind: 'number' })
    if (caseName) chips.push({ label: caseName, kind: 'case' })
    if (isNounish) chips.push({ label: definite ? 'Definite' : 'Indefinite', kind: 'definite' })
    if (person && !gender && !number) chips.push({ label: person.label, kind: 'person' })
  }
  if (p === 'INL') chips.push({ label: 'Disconnected letters', kind: 'other' })

  const summary = uniqChips(chips).map((c) => c.label).join(' · ')

  let irab = ''
  if (isVerb) {
    const bits = [`Form ${form ?? 'I'} ${tense ? tense.toLowerCase() : ''} verb`.trim()]
    if (person) bits.push(person.label)
    bits.push(passive ? 'passive voice' : 'active voice')
    if (mood) bits.push(`${mood.toLowerCase()} mood`)
    irab = bits.join(' · ') + '.'
  } else if (isNounish) {
    const bits = [pos]
    if (derived) bits.push(derived.toLowerCase())
    if (gender || number) bits.push([gender, number].filter(Boolean).join(' '))
    if (caseName) bits.push(`${caseName.toLowerCase()} case`)
    bits.push(definite ? 'definite' : 'indefinite')
    irab = bits.join(' · ') + '.'
  } else if (p === 'PRON' || p === 'DEM' || p === 'REL') {
    irab = [pos, person?.label].filter(Boolean).join(' · ') + '.'
  } else {
    irab = `${pos}.`
  }

  const rules: RuleView[] = []

  if (isNounish && caseName) {
    if (caseName === 'Genitive') {
      rules.push({
        id: 'case-gen',
        title: 'Genitive case (al-jarr)',
        term: 'majrūr',
        kind: 'case',
        body: 'The noun is majrūr. Genitive nouns typically follow a preposition or form the second term of an iḍāfa. The usual genitive ending is kasra (ـِ).',
      })
    } else if (caseName === 'Accusative') {
      rules.push({
        id: 'case-acc',
        title: 'Accusative case (an-naṣb)',
        term: 'manṣūb',
        kind: 'case',
        body: 'The noun is manṣūb. The accusative marks the direct object, adverbs, and the predicate of إِنَّ and its sisters. The usual ending is fatḥa (ـَ).',
      })
    } else {
      rules.push({
        id: 'case-nom',
        title: 'Nominative case (ar-rafʿ)',
        term: 'marfūʿ',
        kind: 'case',
        body: 'The noun is marfūʿ. The nominative marks the subject or the predicate of a nominal sentence. The usual ending is ḍamma (ـُ).',
      })
    }
  }

  if (isVerb) {
    if (tense === 'Perfect') {
      rules.push({
        id: 'tense-perfect',
        title: 'Perfect tense (al-māḍī)',
        term: 'al-māḍī',
        kind: 'tense',
        body: 'The perfect describes a completed action. Its base form is the 3rd person masculine singular, e.g. كَتَبَ “he wrote”.',
      })
    } else if (tense === 'Imperfect') {
      rules.push({
        id: 'tense-imperfect',
        title: 'Imperfect tense (al-muḍāriʿ)',
        term: 'al-muḍāriʿ',
        kind: 'tense',
        body: 'The imperfect describes an action that is ongoing, habitual, or yet to come. Prefixes mark the person: يَكْتُبُ “he writes”, تَكْتُبُ “you write”, أَكْتُبُ “I write”.',
      })
    } else if (tense === 'Imperative') {
      rules.push({
        id: 'tense-imperative',
        title: 'Imperative (al-amr)',
        term: 'al-amr',
        kind: 'tense',
        body: 'The imperative is a command addressed to the listener, e.g. اُكْتُبْ “write!”.',
      })
    }
    if (form && form !== 'I' && VERB_FORMS[form]) {
      rules.push({
        id: `form-${form}`,
        title: VERB_FORMS[form].title,
        term: `form ${form}`,
        kind: 'form',
        body: VERB_FORMS[form].body,
      })
    }
    if (passive) {
      rules.push({
        id: 'voice-passive',
        title: 'Passive voice (al-majhūl)',
        term: 'al-majhūl',
        kind: 'voice',
        body: 'In the passive, the doer is not named: كُتِبَ “it was written”. The subject receives the action.',
      })
    }
    if (mood === 'Subjunctive') {
      rules.push({
        id: 'mood-subj',
        title: 'Subjunctive mood (al-manṣūb)',
        term: 'manṣūb',
        kind: 'mood',
        body: 'The imperfect is subjunctive after particles such as أَنْ, لَنْ, كَيْ, and لِ. It usually ends in fatḥa instead of ḍamma.',
      })
    } else if (mood === 'Jussive') {
      rules.push({
        id: 'mood-jus',
        title: 'Jussive mood (al-majzūm)',
        term: 'majzūm',
        kind: 'mood',
        body: 'The imperfect is jussive after particles such as لَمْ, لَا الناهية, and إِنْ الشَّرْطِيَّة. It usually ends in sukūn.',
      })
    }
  }

  if (derived) {
    const body = derived === 'Active participle'
      ? 'The active participle (ism al-fāʿil) names the one who performs the action: كَاتِب “writer”.'
      : derived === 'Passive participle'
        ? 'The passive participle (ism al-mafʿūl) names the one upon whom the action is done: مَكْتُوب “written”.'
        : 'The verbal noun (maṣdar) names the action itself as a concept: كِتَابَة “writing”.'
    rules.push({ id: `derived-${derived}`, title: derived, term: derived.toLowerCase(), kind: 'derived', body })
  }

  if (isNounish) {
    if (hasAl) {
      rules.push({
        id: 'definite',
        title: 'Definite with al-',
        term: 'al-taʿrīf',
        kind: 'definite',
        body: 'The prefix al- (ٱل) makes the noun definite, like English “the”. In connected speech its hamza is elided, so it is pronounced “l-”.',
      })
    } else if (p === 'PN') {
      rules.push({
        id: 'proper-definite',
        title: 'Proper noun — inherently definite',
        term: 'ism ʿalam',
        kind: 'definite',
        body: 'A proper noun is definite by itself. It does not take the article al- or the indefinite tanwīn in the same way as a common noun.',
      })
    } else if (has(fset, 'INDEF')) {
      rules.push({
        id: 'indefinite',
        title: 'Indefinite (tanwīn)',
        term: 'tanwīn',
        kind: 'definite',
        body: 'The double vowel at the end (tanwīn) marks an indefinite noun: كِتَابٌ “a book”. The tanwīn is not written on a final alif or hamza in the same way.',
      })
    }
  }

  const rawSegments: Segment[] = word.g ?? [[word.a, word.p, 'stem', feats.join('|')]]
  const segments: SegmentView[] = rawSegments.map((seg) => {
    const [text, sp, role, raw] = seg
    const sfeats = raw.split('|').filter(Boolean)
    const code = role === 'prefix' ? prefixCode(sfeats) : role === 'suffix' ? pronounCode(sfeats) : null
    const chips: GrammarChip[] = []
    let note: string | undefined
    if (role === 'prefix' && code && PREFIXES[code]) {
      chips.push({ label: PREFIXES[code].short, kind: 'particle' })
      note = `${PREFIXES[code].label} — “${PREFIXES[code].meaning}”. ${PREFIXES[code].note}`
    } else if (role === 'suffix' && code && PRONOUNS[code]) {
      chips.push({ label: PRONOUNS[code].short, kind: 'pronoun' })
      note = `Attached pronoun — “${PRONOUNS[code].meaning}”. It may be possessive (“his book”) or the object of a verb or preposition (“wrote it”).`
    } else {
      sfeats.forEach((f) => {
        const h = humanFeature(f)
        if (h) chips.push(h)
      })
      if (role === 'stem' && p === 'V') note = 'The verb stem carries the tense, form and subject marking.'
      else if (role === 'stem' && derived) note = `A derived nominal: ${derived.toLowerCase()}.`
      else if (role === 'stem') note = 'The stem carries the core lexical meaning and the case ending.'
    }
    return {
      text,
      pos: sp,
      role,
      roleLabel: role === 'prefix' ? 'Prefix' : role === 'suffix' ? 'Suffix' : 'Stem',
      posLabel: posLabel(sp),
      chips: uniqChips(chips),
      note,
    }
  })

  // prefixes as rules (skip al-; the definiteness rule covers it)
  const seenPrefix = new Set<string>()
  for (const seg of word.g ?? []) {
    if (seg[2] !== 'prefix') continue
    const code = prefixCode(seg[3].split('|'))
    if (!code || code === 'Al' || seenPrefix.has(code)) continue
    seenPrefix.add(code)
    const info = PREFIXES[code]
    rules.push({
      id: `prefix-${code}`,
      title: info.label,
      term: info.short,
      kind: 'particle',
      body: `${info.note} It contributes “${info.meaning}” to the word.`,
    })
  }

  const suffixCodes = new Set<string>()
  for (const seg of word.g ?? []) {
    if (seg[2] !== 'suffix') continue
    const code = pronounCode(seg[3].split('|'))
    if (!code || !PRONOUNS[code] || suffixCodes.has(code)) continue
    suffixCodes.add(code)
    rules.push({
      id: `suffix-${code}`,
      title: `Attached pronoun ${PRONOUNS[code].short}`,
      term: 'ḍamīr muttaṣil',
      kind: 'pronoun',
      body: `The suffix ${PRONOUNS[code].short} means “${PRONOUNS[code].meaning}”. A pronoun suffix can be possessive (ـهُ “his”) or the direct object of a verb (ـهُ “him”).`,
    })
  }

  if ((word.g ?? []).filter((s) => s[2] === 'stem').length > 1) {
    rules.push({
      id: 'compound',
      title: 'Compound word',
      term: 'murakkab',
      kind: 'other',
      body: 'This word is a contraction of two stems. The segment breakdown shows each component and the grammatical work it does.',
    })
  }

  if (p === 'INL') {
    rules.push({
      id: 'initials',
      title: 'Disconnected letters (al-ḥurūf al-muqaṭṭaʿa)',
      term: 'ḥurūf muqaṭṭaʿa',
      kind: 'other',
      body: 'These are the separate letters that open some sūras. Their full meaning is known to Allah; they are recited letter by letter.',
    })
  }

  return { posLabel: pos, summary, irab, chips: uniqChips(chips), segments, rules }
}

export interface GlossaryEntry {
  term: string
  arabic: string
  body: string
}

export const GRAMMAR_GUIDE: GlossaryEntry[] = [
  { term: 'Iʿrāb', arabic: 'الإعراب', body: 'The system of case and mood endings that shows a word’s grammatical role in a sentence.' },
  { term: 'Marfūʿ (nominative)', arabic: 'مرفوع', body: 'The nominative case, usually marked by ḍamma (ـُ). It marks the subject and the predicate of a nominal sentence.' },
  { term: 'Manṣūb (accusative)', arabic: 'منصوب', body: 'The accusative case, usually marked by fatḥa (ـَ). It marks direct objects, adverbs, and the predicate of إِنَّ.' },
  { term: 'Majrūr (genitive)', arabic: 'مجرور', body: 'The genitive case, usually marked by kasra (ـِ). It follows prepositions and marks the second term of an iḍāfa.' },
  { term: 'Iḍāfa', arabic: 'إضافة', body: 'The possessive construction: “the book of Allah”. The first noun loses tanwīn; the second is genitive.' },
  { term: 'Māḍī', arabic: 'الماضي', body: 'The perfect tense: a completed action, e.g. كَتَبَ “he wrote”.' },
  { term: 'Muḍāriʿ', arabic: 'المضارع', body: 'The imperfect tense: an ongoing, habitual, or future action, e.g. يَكْتُبُ “he writes”.' },
  { term: 'Amr', arabic: 'الأمر', body: 'The imperative: a command, e.g. اُكْتُبْ “write!”.' },
  { term: 'Maṣdar', arabic: 'المصدر', body: 'The verbal noun: the action understood as a concept, e.g. كِتَابَة “writing”.' },
  { term: 'Ism fāʿil', arabic: 'اسم الفاعل', body: 'The active participle: the one who does the action, e.g. كَاتِب “writer”.' },
  { term: 'Ism mafʿūl', arabic: 'اسم المفعول', body: 'The passive participle: the one upon whom the action is done, e.g. مَكْتُوب “written”.' },
  { term: 'Ṣarf', arabic: 'الصرف', body: 'Arabic morphology: how roots combine with patterns to produce verbs, nouns, participles and verbal nouns.' },
  { term: 'Jidhr', arabic: 'الجذر', body: 'The root: usually three consonants that carry a core meaning across a family of derived words.' },
  { term: 'Ḍamīr', arabic: 'الضمير', body: 'A pronoun. Attached pronouns (ḍamīr muttaṣil) join the end of a word, e.g. ـهُ “him/his”.' },
]
