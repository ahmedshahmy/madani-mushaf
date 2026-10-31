import { Check, X } from 'lucide-react'
import type { Toast } from '../lib/hooks'

export function Toasts({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span className="toast-icon"><Check size={14} /></span>
          <span>{t.text}</span>
          <button className="icon-btn toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
