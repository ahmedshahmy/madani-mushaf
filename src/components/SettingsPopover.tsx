import { Minus, Monitor, Moon, RotateCcw, Sun, Type, X } from 'lucide-react'
import type { ThemeChoice } from '../lib/hooks'

interface SettingsPopoverProps {
  open: boolean
  onClose: () => void
  theme: ThemeChoice
  setTheme: (t: ThemeChoice) => void
  arabicScale: number
  setArabicScale: (n: number) => void
  uiScale: number
  setUiScale: (n: number) => void
  showTranslit: boolean
  setShowTranslit: (v: boolean) => void
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number(n.toFixed(2))))
}

export function SettingsPopover({
  open, onClose, theme, setTheme, arabicScale, setArabicScale, uiScale, setUiScale,
  showTranslit, setShowTranslit,
}: SettingsPopoverProps) {
  if (!open) return null
  return (
    <div className="popover-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="settings-popover" role="dialog" aria-modal="true" aria-label="Reading settings and text size">
        <div className="popover-head">
          <h3>Reading settings</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings"><X size={16} /></button>
        </div>

        <div className="setting-block">
          <div className="setting-label"><Sun size={15} /> Appearance</div>
          <div className="theme-toggle" role="group" aria-label="Theme">
            <button className={theme === 'light' ? 'is-active' : ''} onClick={() => setTheme('light')}>
              <Sun size={14} /> Light
            </button>
            <button className={theme === 'dark' ? 'is-active' : ''} onClick={() => setTheme('dark')}>
              <Moon size={14} /> Dark
            </button>
            <button className={theme === 'system' ? 'is-active' : ''} onClick={() => setTheme('system')}>
              <Monitor size={14} /> Auto
            </button>
          </div>
        </div>

        <div className="setting-block size-setting">
          <div className="setting-label"><Type size={15} /> Text size</div>

          <div className="size-control-head">
            <span>Arabic</span>
            <span className="font-size-value">{Math.round(arabicScale * 100)}%</span>
          </div>
          <div className="font-size-row">
            <button
              className="icon-btn"
              onClick={() => setArabicScale(clamp(arabicScale - 0.05, 1, 1.7))}
              aria-label="Decrease Arabic size"
            >
              <Minus size={15} />
            </button>
            <input
              type="range"
              min="1"
              max="1.7"
              step="0.05"
              value={arabicScale}
              onChange={(e) => setArabicScale(Number(e.target.value))}
              aria-label="Arabic font size"
            />
            <button
              className="icon-btn"
              onClick={() => setArabicScale(clamp(arabicScale + 0.05, 1, 1.7))}
              aria-label="Increase Arabic size"
            >
              <span className="plus-glyph">+</span>
            </button>
          </div>
          <div
            className="settings-preview arabic-preview"
            dir="rtl"
            style={{ fontSize: `${Math.min(1.7, 0.95 * arabicScale)}rem` }}
          >
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </div>
          <p className="setting-hint">
            On phones, Arabic above 100% switches the mushaf page to a flowing, scrollable
            large-print layout. The fixed 15-line page returns at 100%.
          </p>
          {arabicScale > 1 ? (
            <button className="btn btn-ghost size-reset" onClick={() => setArabicScale(1)}>
              Return to the 15-line page
            </button>
          ) : null}

          <div className="size-control-head english-head">
            <span>English</span>
            <span className="font-size-value">{Math.round(uiScale * 100)}%</span>
          </div>
          <div className="font-size-row">
            <button
              className="icon-btn"
              onClick={() => setUiScale(clamp(uiScale - 0.05, 0.9, 1.3))}
              aria-label="Decrease English size"
            >
              <Minus size={15} />
            </button>
            <input
              type="range"
              min="0.9"
              max="1.3"
              step="0.05"
              value={uiScale}
              onChange={(e) => setUiScale(Number(e.target.value))}
              aria-label="English font size"
            />
            <button
              className="icon-btn"
              onClick={() => setUiScale(clamp(uiScale + 0.05, 0.9, 1.3))}
              aria-label="Increase English size"
            >
              <span className="plus-glyph">+</span>
            </button>
          </div>
          <div className="settings-preview english-preview" dir="ltr">
            The Book — a guidance for the conscious.
          </div>
        </div>

        <label className="setting-switch">
          <span>
            <b>Transliteration</b>
            <small>Show Latin transliteration in the word panel</small>
          </span>
          <input
            type="checkbox"
            checked={showTranslit}
            onChange={(e) => setShowTranslit(e.target.checked)}
          />
          <span className="switch-track" aria-hidden="true"><span /></span>
        </label>

        <button
          className="btn btn-ghost reset-btn"
          onClick={() => {
            setArabicScale(1)
            setUiScale(1)
            setTheme('system')
            setShowTranslit(true)
          }}
        >
          <RotateCcw size={14} /> Reset preferences
        </button>
      </div>
    </div>
  )
}
