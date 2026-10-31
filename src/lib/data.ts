import type {
  DerivedLemma, Lemma, Lexicon, Meta, Occurrence, PageData, Root, RootDetail,
} from '../types'

const BASE = import.meta.env.BASE_URL

const jsonCache = new Map<string, Promise<unknown>>()

async function fetchJSON<T>(path: string): Promise<T> {
  const existing = jsonCache.get(path)
  if (existing) return existing as Promise<T>
  const promise = fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } }).then(async (res) => {
    if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`)
    return (await res.json()) as T
  })
  jsonCache.set(path, promise)
  promise.catch(() => jsonCache.delete(path))
  return promise
}

/* ------------------------------------------------------------------ */
/* Meta                                                                 */
/* ------------------------------------------------------------------ */
let metaPromise: Promise<Meta> | null = null
export function loadMeta(): Promise<Meta> {
  if (!metaPromise) metaPromise = fetchJSON<Meta>('quran/meta.json')
  return metaPromise
}

/* ------------------------------------------------------------------ */
/* Pages, with a small LRU cache                                        */
/* ------------------------------------------------------------------ */
type PageTuple = PageData
const pageCache = new Map<number, PageData>()
const pageInflight = new Map<number, Promise<PageData>>()
const PAGE_CACHE_MAX = 18

function rememberPage(n: number, page: PageData) {
  pageCache.delete(n)
  pageCache.set(n, page)
  if (pageCache.size > PAGE_CACHE_MAX) {
    const first = pageCache.keys().next().value
    if (first !== undefined) pageCache.delete(first)
  }
}

export function getCachedPage(n: number): PageData | undefined {
  return pageCache.get(n)
}

export function loadPage(n: number): Promise<PageData> {
  const cached = pageCache.get(n)
  if (cached) {
    // touch for LRU
    pageCache.delete(n)
    pageCache.set(n, cached)
    return Promise.resolve(cached)
  }
  const inflight = pageInflight.get(n)
  if (inflight) return inflight
  const file = `${String(n).padStart(3, '0')}.json`
  const promise = fetchJSON<PageTuple>(`quran/pages/${file}`)
    .then((page) => {
      rememberPage(n, page)
      pageInflight.delete(n)
      return page
    })
    .catch((err) => {
      pageInflight.delete(n)
      throw err
    })
  pageInflight.set(n, promise)
  return promise
}

export function prefetchPage(n: number) {
  if (n < 1 || n > 604 || pageCache.has(n)) return
  loadPage(n).catch(() => {})
}

/* ------------------------------------------------------------------ */
/* Lexicon                                                              */
/* ------------------------------------------------------------------ */
type LemmaTuple = [
  number, string, string, string, string, string | null, number | null,
  number, string, string[], string, number,
]
type RootTuple = [number, string, string, string, number, string, number]
interface RawLexicon { lemmas: LemmaTuple[]; roots: RootTuple[] }

let lexiconPromise: Promise<Lexicon> | null = null

export function loadLexicon(): Promise<Lexicon> {
  if (!lexiconPromise) {
    lexiconPromise = fetchJSON<RawLexicon>('quran/lexicon.json').then((raw) => {
      const lemmas: Lemma[] = raw.lemmas.map((t) => ({
        id: t[0], ar: t[1], plain: t[2], pos: t[3], type: t[4], form: t[5],
        root: t[6], count: t[7], gloss: t[8], glosses: t[9], first: t[10], page: t[11],
      }))
      const roots: Root[] = raw.roots.map((t) => ({
        id: t[0], ar: t[1], bw: t[2], tr: t[3], count: t[4], first: t[5], page: t[6],
      }))
      const lemmaById = new Map(lemmas.map((l) => [l.id, l]))
      const rootById = new Map(roots.map((r) => [r.id, r]))
      return { lemmas, roots, lemmaById, rootById }
    })
  }
  return lexiconPromise
}

/* ------------------------------------------------------------------ */
/* Roots                                                                */
/* ------------------------------------------------------------------ */
type RootLemmaTuple = [
  number, string, string, string, string | null, number, string, string[],
  Array<[string, number]>, string, number,
]
interface RawRootDetail {
  id: number; ar: string; bw: string; tr: string; count: number;
  senses: string[]; lemmas: RootLemmaTuple[];
}

const rootCache = new Map<number, Promise<RootDetail>>()

export function loadRoot(id: number): Promise<RootDetail> {
  let p = rootCache.get(id)
  if (!p) {
    p = fetchJSON<RawRootDetail>(`quran/roots/${id}.json`).then((raw) => ({
      id: raw.id, ar: raw.ar, bw: raw.bw, tr: raw.tr, count: raw.count,
      senses: raw.senses,
      lemmas: raw.lemmas.map((t): DerivedLemma => ({
        id: t[0], ar: t[1], plain: t[2], type: t[3], form: t[4], count: t[5],
        gloss: t[6], glosses: t[7], forms: t[8], first: t[9], page: t[10],
      })),
    }))
    rootCache.set(id, p)
    p.catch(() => rootCache.delete(id))
  }
  return p
}

/* ------------------------------------------------------------------ */
/* Occurrences                                                          */
/* ------------------------------------------------------------------ */
type OccTuple = [string, number, string, string, string, string, number | null]
const occCache = new Map<string, Promise<Occurrence[]>>()

function loadOccFile(key: string): Promise<Occurrence[]> {
  let p = occCache.get(key)
  if (!p) {
    p = fetchJSON<OccTuple[]>(`quran/occ/${key}.json`).then((rows) =>
      rows.map((t) => ({
        id: t[0], page: t[1], text: t[2], gloss: t[3],
        before: t[4], after: t[5], lemma: t[6],
      })),
    )
    occCache.set(key, p)
    p.catch(() => occCache.delete(key))
  }
  return p
}

export function loadRootOccurrences(rootId: number) {
  return loadOccFile(`root-${rootId}`)
}

export function loadLemmaOccurrences(lemmaId: number) {
  return loadOccFile(`lemma-${lemmaId}`)
}

export function occurrenceSource(word: { r?: number; l?: number }): 'root' | 'lemma' | null {
  if (word.r !== undefined) return 'root'
  if (word.l !== undefined) return 'lemma'
  return null
}

export function loadOccurrencesForWord(word: { r?: number; l?: number }): Promise<Occurrence[]> {
  if (word.r !== undefined) return loadRootOccurrences(word.r)
  if (word.l !== undefined) return loadLemmaOccurrences(word.l)
  return Promise.resolve([])
}
