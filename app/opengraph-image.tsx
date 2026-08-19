import { ImageResponse } from 'next/og'

export const alt = 'PATINA — Objects that outlast the season'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Default social card. Rendered at request time and cached by the CDN.
 *
 * Satori cannot resolve CSS variables, so the palette is repeated here as
 * literals. These three values are the light-mode `--background`, `--foreground`
 * and `--signal` from `app/globals.css` and must be moved together with them.
 */
const PAPER = '#ffffff'
const INK = '#0a0a0a'
const SIGNAL = '#1f3bff'

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        background: PAPER,
        color: INK,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 30, letterSpacing: 10, fontWeight: 600 }}>PATINA</div>
        <div style={{ fontSize: 20, letterSpacing: 4, color: SIGNAL }}>NEW SEASON — 01</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: -3, maxWidth: 900 }}>
          Objects that outlast the season
        </div>
        <div style={{ fontSize: 28, marginTop: 32, opacity: 0.6, maxWidth: 820 }}>
          Apparel, bags, footwear and home goods chosen for how they wear in.
        </div>
      </div>

      <div style={{ display: 'flex', width: '100%', height: 6, background: SIGNAL }} />
    </div>,
    size,
  )
}
