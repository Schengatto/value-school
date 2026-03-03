import { driver, type Config } from 'driver.js'
import 'driver.js/dist/driver.css'

const BULL_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:36px;height:36px;flex-shrink:0">
  <path d="M25 38 L12 18 Q10 14 14 16 L28 32" fill="#d97706"/>
  <path d="M75 38 L88 18 Q90 14 86 16 L72 32" fill="#d97706"/>
  <ellipse cx="22" cy="42" rx="8" ry="5" transform="rotate(-20 22 42)" fill="#fdba74"/>
  <ellipse cx="78" cy="42" rx="8" ry="5" transform="rotate(20 78 42)" fill="#fdba74"/>
  <circle cx="50" cy="52" r="30" fill="#fed7aa"/>
  <ellipse cx="50" cy="64" rx="18" ry="12" fill="#ffedd5"/>
  <ellipse cx="43" cy="65" rx="3" ry="2.5" fill="#fb923c"/>
  <ellipse cx="57" cy="65" rx="3" ry="2.5" fill="#fb923c"/>
  <path d="M44 69 Q50 76 56 69" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
  <circle cx="38" cy="48" r="5" fill="#1f2937"/>
  <circle cx="62" cy="48" r="5" fill="#1f2937"/>
  <circle cx="40" cy="46" r="1.8" fill="white"/>
  <circle cx="64" cy="46" r="1.8" fill="white"/>
  <path d="M44 58 Q50 61 56 58" fill="none" stroke="#ea580c" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="30" cy="56" r="4" fill="rgba(251,207,232,0.5)"/>
  <circle cx="70" cy="56" r="4" fill="rgba(251,207,232,0.5)"/>
</svg>`

function createBullSvgElement(): Element {
  const parser = new DOMParser()
  const doc = parser.parseFromString(BULL_SVG, 'image/svg+xml')
  return doc.documentElement
}

/**
 * Creates a Driver.js instance with bull mascot avatar and quips injected into each popover.
 * Pass the standard driver config plus a `quips` array (one string per step).
 */
export function createBullDriver(config: Config, quips: string[]) {
  return driver({
    ...config,
    popoverClass: 'tour-popover',
    onPopoverRender(popover, { state }) {
      const idx = state.activeIndex ?? 0
      const quip = quips[idx]
      if (!quip) return

      const header = document.createElement('div')
      header.className = 'tour-bull-header'

      header.appendChild(createBullSvgElement())

      const quipSpan = document.createElement('span')
      quipSpan.className = 'tour-bull-quip'
      quipSpan.textContent = quip
      header.appendChild(quipSpan)

      const title = popover.title
      title.parentElement?.insertBefore(header, title)
    }
  })
}
