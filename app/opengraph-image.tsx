import { ImageResponse } from 'next/og'

export const alt = 'MyKart — Considered goods, built to last'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Default social card. Rendered at request time and cached by the CDN. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background: '#f5efe6',
        color: '#2a2622',
      }}
    >
      <div style={{ fontSize: 26, letterSpacing: 6, textTransform: 'uppercase', opacity: 0.6 }}>
        MyKart
      </div>
      <div style={{ fontSize: 88, lineHeight: 1.05, marginTop: 28, maxWidth: 900 }}>
        Considered goods, built to last
      </div>
      <div style={{ fontSize: 30, marginTop: 32, opacity: 0.7, maxWidth: 820 }}>
        Apparel, bags, footwear and home goods chosen for how they wear in.
      </div>
      <div
        style={{
          marginTop: 48,
          width: 120,
          height: 8,
          background: '#c2683c',
          borderRadius: 4,
          display: 'flex',
        }}
      />
    </div>,
    size,
  )
}
