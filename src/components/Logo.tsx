export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <rect width="64" height="64" rx="15" fill="var(--logo-bg)" />
      <path
        d="M32 7.5l5.6 13.4L51 15.7l-5.9 13.6L58 34.5l-13.4 4.4L51 52.5l-13.6-5.9L32 60l-5.4-13.4L13 52.5l5.7-13.6L5 34.5l13.6-5.2L12.7 15.7l13.5 5.2z"
        fill="none"
        stroke="var(--logo-gold)"
        strokeWidth="1.1"
        opacity=".75"
      />
      <path d="M23 23.5h18M23 30.5h13M23 37.5h18" stroke="var(--logo-ink)" strokeWidth="2.3" strokeLinecap="round" />
      <circle cx="46.5" cy="20" r="2.2" fill="var(--logo-gold)" />
    </svg>
  )
}
