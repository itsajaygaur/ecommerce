import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/**
 * Home-screen icon: the same "P" tile as app/icon.svg, scaled up. The tile is
 * opaque and unrounded because iOS composites black behind transparency and
 * masks its own corners.
 *
 * Satori cannot resolve CSS variables, so the palette is repeated here as
 * literals. These are the light-mode `--background` and `--signal` from
 * `app/globals.css` and must be moved together with them.
 */
const PAPER = '#ffffff'
const SIGNAL = '#1f3bff'

/** icon.svg's geometry is drawn in a 32-unit space; scale it to the tile. */
const UNIT = size.width / 32

const P_RECTS = [
  { left: 10, top: 6, width: 4, height: 20 }, // stem
  { left: 14, top: 6, width: 8, height: 4 }, // bowl top
  { left: 18, top: 10, width: 4, height: 4 }, // bowl right
  { left: 14, top: 14, width: 8, height: 4 }, // bowl bottom
]

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: SIGNAL }}>
      {P_RECTS.map((rect, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: rect.left * UNIT,
            top: rect.top * UNIT,
            width: rect.width * UNIT,
            height: rect.height * UNIT,
            background: PAPER,
          }}
        />
      ))}
    </div>,
    size,
  )
}
