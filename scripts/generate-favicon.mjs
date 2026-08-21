/**
 * Generates `app/favicon.ico` — the PATINA "P" tile at 16, 32 and 48 px.
 *
 * The mark is the same geometry as `app/icon.svg`: a blocky paper "P" on a
 * signal-cobalt tile. `/favicon.ico` is fetched unconditionally by legacy
 * crawlers and bookmark tooling regardless of <link> tags, so it ships as a
 * real multi-size ICO rather than being deleted in favour of the SVG.
 *
 * The ICO is written by hand (32-bit BGRA BMP frames, no PNG frames) so the
 * script stays dependency-free, like generate-placeholders.mjs.
 *
 * Run with: node scripts/generate-favicon.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SIGNAL = [0x1f, 0x3b, 0xff] // light-mode --signal from app/globals.css
const PAPER = [0xff, 0xff, 0xff] // light-mode --background
const SIZES = [16, 32, 48]

/**
 * The "P" as rectangles in a 32-unit design space (identical to icon.svg's
 * path). Every coordinate is even, so the 16px (x0.5) and 48px (x1.5) frames
 * land on whole pixels and need no anti-aliasing.
 */
const P_RECTS = [
  [10, 6, 4, 20], // stem
  [14, 6, 8, 4], // bowl top
  [18, 10, 4, 4], // bowl right (the 4x4 gap at 14,10 is the counter)
  [14, 14, 8, 4], // bowl bottom
]

/** Corner radius in design units, mirroring the site's 0.125rem radius token. */
const TILE_RADIUS = 2

function renderFrame(size) {
  const scale = size / 32
  const radius = Math.max(1, Math.round(TILE_RADIUS * scale))
  // RGBA, row-major from the top; converted to a bottom-up BMP later.
  const px = new Uint8Array(size * size * 4)

  const setPixel = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = a
  }

  // Cobalt tile with rounded corners; outside the radius stays transparent.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x < radius ? radius - 1 : x >= size - radius ? size - radius : x
      const cy = y < radius ? radius - 1 : y >= size - radius ? size - radius : y
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= radius * radius) setPixel(x, y, SIGNAL)
    }
  }

  // Paper "P".
  for (const [rx, ry, rw, rh] of P_RECTS) {
    for (let y = ry * scale; y < (ry + rh) * scale; y++) {
      for (let x = rx * scale; x < (rx + rw) * scale; x++) {
        setPixel(x, y, PAPER)
      }
    }
  }

  return px
}

/** Wraps top-down RGBA pixels into an ICO BMP frame (header + XOR + AND). */
function bmpFrame(size, px) {
  const xorStride = size * 4
  const andStride = Math.ceil(size / 32) * 4 // 1bpp rows padded to 32 bits
  const frame = Buffer.alloc(40 + xorStride * size + andStride * size)

  frame.writeUInt32LE(40, 0) // BITMAPINFOHEADER size
  frame.writeInt32LE(size, 4)
  frame.writeInt32LE(size * 2, 8) // doubled height: XOR + AND blocks
  frame.writeUInt16LE(1, 12) // planes
  frame.writeUInt16LE(32, 14) // bits per pixel
  frame.writeUInt32LE(xorStride * size + andStride * size, 20)

  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * size * 4 // BMP rows are bottom-up
    const xorRow = 40 + y * xorStride
    const andRow = 40 + xorStride * size + y * andStride

    for (let x = 0; x < size; x++) {
      const i = src + x * 4
      frame[xorRow + x * 4] = px[i + 2] // BGRA
      frame[xorRow + x * 4 + 1] = px[i + 1]
      frame[xorRow + x * 4 + 2] = px[i]
      frame[xorRow + x * 4 + 3] = px[i + 3]
      if (px[i + 3] === 0) frame[andRow + (x >> 3)] |= 0x80 >> (x & 7)
    }
  }

  return frame
}

const frames = SIZES.map((size) => ({ size, data: bmpFrame(size, renderFrame(size)) }))

const header = Buffer.alloc(6 + frames.length * 16)
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(frames.length, 4)

let offset = header.length
frames.forEach(({ size, data }, i) => {
  const entry = 6 + i * 16
  header[entry] = size
  header[entry + 1] = size
  header.writeUInt16LE(1, entry + 4) // planes
  header.writeUInt16LE(32, entry + 6) // bits per pixel
  header.writeUInt32LE(data.length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += data.length
})

const out = join(process.cwd(), 'app', 'favicon.ico')
writeFileSync(out, Buffer.concat([header, ...frames.map((f) => f.data)]))
console.log(`Wrote ${out} (${SIZES.join(', ')} px).`)
