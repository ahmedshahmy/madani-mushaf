import { Minus, Monitor, Moon, RotateCcw, Sun, Type, X } from 'lucide-react'
import type { ThemeChoice } from '../lib/hooks'

interface SettingsPopoverProps {
  open: boolean
  onClose: () => void
  theme: ThemeChoice
  setTheme: (t: ThemeChoice) => void
  fontScale: number
  setFontScale: (n: number) => void
  showTranslit: boolean
  setShowTranslit: (v: boolean) => void
}

export function SettingsPopover({
  open, onClose, theme, setTheme, fontScale, setFontScale, showTranslit, setShowTranslit,
}: SettingsPopoverProps) {
  if (!open) return null
  return (
    <div className="popover-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="settings-popover" role="dialog" aria-modal="true" aria-label="Reading settings">
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
          <div className="setting-label"><Type size={15} /> Arabic size</div>
          <div className="font-size-row">
            <button
              className="icon-btn"
              onClick={() => setFontScale(Math.max(0.85, Number((fontScale - 0.1).toFixed(2))))}
              aria-label="Decrease Arabic size"
            >
              <Minus size={15} />
            </button>
            <input
              type="range"
              min="0.85"
              max="1.35"
              step="0.05"
              value={fontScale}
              onChange={(e) => setFontScale(Number(e.target.value))}
              aria-label="Arabic font size"
            />
            <button
              className="icon-btn"
              onClick={() => setFontScale(Math.min(1.35, Number((fontScale + 0.1).toFixed(2))))}
              aria-label="Increase Arabic size"
            >
              <span className="plus-glyph">+</span>
            </button>
            <span className="font-size-value">{Math.round(fontScale * 100)}%</span>
          </div>
          <div className="settings-preview" dir="rtl" style={{ fontSize: `${1.35 * fontScale}rem` }}>
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
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
          onClick={() => { setFontScale(1); setTheme('system'); setShowTranslit(true) }}
        >
          <RotateCcw size={14} /> Reset preferences
        </button>
      </div>
    </div>
  )
}
