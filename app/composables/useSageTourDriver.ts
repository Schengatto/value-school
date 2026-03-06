import { driver, type Config } from 'driver.js'
import 'driver.js/dist/driver.css'

const SAGE_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:36px;height:36px;flex-shrink:0">
  <path d="M20 50 Q18 38 25 30 Q30 26 35 28" fill="#e5e7eb"/>
  <path d="M80 50 Q82 38 75 30 Q70 26 65 28" fill="#e5e7eb"/>
  <ellipse cx="20" cy="52" rx="5" ry="7" fill="#fef3c7"/>
  <ellipse cx="80" cy="52" rx="5" ry="7" fill="#fef3c7"/>
  <circle cx="50" cy="50" r="30" fill="#fffbeb"/>
  <path d="M36 32 Q50 30 64 32" fill="none" stroke="#fde68a" stroke-width="0.6"/>
  <path d="M30 42 Q35 38 42 41" fill="none" stroke="#d1d5db" stroke-width="2" stroke-linecap="round"/>
  <path d="M58 41 Q65 38 70 42" fill="none" stroke="#d1d5db" stroke-width="2" stroke-linecap="round"/>
  <circle cx="37" cy="48" r="9" fill="none" stroke="#4b5563" stroke-width="1.8"/>
  <circle cx="63" cy="48" r="9" fill="none" stroke="#4b5563" stroke-width="1.8"/>
  <path d="M46 48 Q50 46 54 48" fill="none" stroke="#4b5563" stroke-width="1.5"/>
  <circle cx="37" cy="48" r="3" fill="#374151"/>
  <circle cx="63" cy="48" r="3" fill="#374151"/>
  <circle cx="38.5" cy="47" r="1.2" fill="white"/>
  <circle cx="64.5" cy="47" r="1.2" fill="white"/>
  <path d="M48 54 Q50 58 52 54" fill="none" stroke="#fcd34d" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M42 62 Q50 66 58 62" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="30" cy="56" r="4" fill="rgba(251,207,232,0.3)"/>
  <circle cx="70" cy="56" r="4" fill="rgba(251,207,232,0.3)"/>
  <path d="M35 78 L42 72 L50 76 L58 72 L65 78" fill="none" stroke="#6b7280" stroke-width="1.5"/>
  <path d="M50 76 L48 84 L50 86 L52 84 Z" fill="#dc2626"/>
</svg>`

function createSageSvgElement(): Element {
  const parser = new DOMParser()
  const doc = parser.parseFromString(SAGE_SVG, 'image/svg+xml')
  return doc.documentElement
}

/**
 * Creates a Driver.js instance with sage mascot avatar and quips injected into each popover.
 * Pass the standard driver config plus a `quips` array (one string per step).
 */
export function createSageDriver(config: Config, quips: string[]) {
  return driver({
    ...config,
    popoverClass: 'tour-popover',
    onPopoverRender(popover, { state }) {
      const idx = state.activeIndex ?? 0
      const quip = quips[idx]
      if (!quip) return

      const header = document.createElement('div')
      header.className = 'tour-sage-header'

      header.appendChild(createSageSvgElement())

      const quipSpan = document.createElement('span')
      quipSpan.className = 'tour-sage-quip'
      quipSpan.textContent = quip
      header.appendChild(quipSpan)

      const title = popover.title
      title.parentElement?.insertBefore(header, title)
    }
  })
}
