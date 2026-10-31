export function PageSkeleton() {
  const widths = [92, 88, 96, 84, 94, 90, 97, 86, 93, 89, 95, 91, 88, 94, 90]
  return (
    <div className="mushaf-page skeleton-page" aria-busy="true" aria-label="Loading mushaf page">
      <div className="mushaf-inner">
        <div className="page-crest"><span className="crest-line" /><span className="crest-star">✦</span><span className="crest-line" /></div>
        <div className="mushaf-lines">
          {widths.map((w, i) => (
            <div className="skeleton-line" key={i} style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mushaf-page error-page">
      <div className="error-inner">
        <div className="empty-icon">!</div>
        <h2>Could not open this page</h2>
        <p>{message}</p>
        <button className="btn btn-primary" onClick={onRetry}>Try again</button>
      </div>
    </div>
  )
}
