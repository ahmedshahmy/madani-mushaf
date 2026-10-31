const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

export function arabicDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => AR_DIGITS[Number(d)])
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Remove Qur'anic marks and unify orthographic variants for matching. */
export function normalizeArabic(input: string): string {
  let s = input.normalize('NFC')
  // The Qur'anic dagger alef (U+0670) is a long ā; make it a plain alef
  // before stripping marks so words like كِتَٰب search as كتاب.
  s = s.replace(/\u0670/g, 'ا')
  s = s.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u0640\u08F0-\u08F2\u06DD\u06DE]/g, '')
  s = s.replace(/[آأإٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  s = s.replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[ءـ]/g, '')
  return s.replace(/[^\u0621-\u064A\u0671]/g, '')
}

export function prettyArabic(input: string): string {
  return input.replace(/\u0640/g, '')
}

export function stripPauseMarks(input: string): string {
  return input.replace(/[\u06D6-\u06ED\u06DD\u06DE]/g, '').replace(/\s+/g, ' ').trim()
}

export function glossOrDash(gloss: string): string {
  return gloss && gloss.trim() ? gloss : '—'
}

export function plural(n: number, one: string, many?: string): string {
  return n === 1 ? one : many ?? `${one}s`
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export function pageLabel(n: number): string {
  return `Page ${n}`
}

export function verseLabel(key: string): string {
  return key.replace(':', ':')
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}
