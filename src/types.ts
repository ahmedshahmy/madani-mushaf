export type SegmentRole = 'prefix' | 'stem' | 'suffix'
export type Segment = [text: string, pos: string, role: SegmentRole, feats: string]

export interface Word {
  i: string // location, e.g. 2:2:2
  a: string // Uthmani Arabic
  t: string // word-by-word English gloss
  tr?: string // transliteration
  p: string // head part of speech
  f?: string[] // head-stem morphological features
  r?: number // root id
  l?: number // lemma id
  g?: Segment[] // segments when the word has affixes / multiple stems
}

export interface EndMarker {
  e: string // Arabic-Indic verse number
  v: string // verse key
}

export type LineItem = Word | EndMarker

export interface Line {
  l: number
  t: 's' | 'b' | 'a'
  s?: number
  c?: 0 | 1
  w?: LineItem[]
}

export interface VerseMeta {
  k: string
  t: string
  j: number
  h: number
  s: number
  a: number
  sd?: number | null
}

export interface PageData {
  p: number
  lines: Line[]
  verses: VerseMeta[]
  juz: number
  hizb: number
  surahs: number[]
  sajdah: boolean
}

export interface Chapter {
  id: number
  name: string
  ar: string
  en: string
  verses: number
  start: number
  end: number
  rev: string
}

export interface JuzMeta {
  id: number
  start: number
}

export interface Meta {
  pageCount: number
  wordCount: number
  verseCount: number
  rootCount: number
  lemmaCount: number
  chapters: Chapter[]
  juzs: JuzMeta[]
  basmala: string
  versePages: Record<string, number>
  translation: string
  built: string
}

export interface Lemma {
  id: number
  ar: string
  plain: string
  pos: string
  type: string
  form: string | null
  root: number | null
  count: number
  gloss: string
  glosses: string[]
  first: string
  page: number
}

export interface Root {
  id: number
  ar: string
  bw: string
  tr: string
  count: number
  first: string
  page: number
}

export interface Lexicon {
  lemmas: Lemma[]
  roots: Root[]
  lemmaById: Map<number, Lemma>
  rootById: Map<number, Root>
}

export interface DerivedLemma {
  id: number
  ar: string
  plain: string
  type: string
  form: string | null
  count: number
  gloss: string
  glosses: string[]
  forms: Array<[string, number]>
  first: string
  page: number
}

export interface RootDetail {
  id: number
  ar: string
  bw: string
  tr: string
  count: number
  senses: string[]
  lemmas: DerivedLemma[]
}

export interface Occurrence {
  id: string
  page: number
  text: string
  gloss: string
  before: string
  after: string
  lemma: number | null
}

export type PanelTab = 'meaning' | 'root' | 'grammar' | 'occurrences'
export type OccFilter = 'form' | 'lemma' | 'root'

export interface ToastMessage {
  id: number
  text: string
  tone?: 'default' | 'success'
}
