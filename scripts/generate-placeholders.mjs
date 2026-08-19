/**
 * Generates the local product placeholder artwork in `public/products`.
 *
 * These stand in for real photography so a fresh clone renders a complete
 * storefront without Supabase credentials. Each is a flat editorial composition:
 * a warm ground, a soft cast shadow and a simple silhouette of the item.
 *
 * Run with: node scripts/generate-placeholders.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = join(process.cwd(), 'public', 'products')
const W = 900
const H = 1200

/** Silhouettes are drawn inside a 0 0 900 1200 viewBox, centred around x=450. */
const shapes = {
  shirt: (c) => `
    <path d="M250 380 L370 320 Q450 380 530 320 L650 380 L690 520 L610 555 L610 900 Q450 925 290 900 L290 555 L210 520 Z"
          fill="${c.body}"/>
    <path d="M370 320 Q450 420 530 320 L505 300 Q450 360 395 300 Z" fill="${c.shade}"/>
    <path d="M450 400 L450 900" stroke="${c.line}" stroke-width="4" opacity="0.5"/>
    <circle cx="450" cy="500" r="7" fill="${c.line}" opacity="0.6"/>
    <circle cx="450" cy="600" r="7" fill="${c.line}" opacity="0.6"/>
    <circle cx="450" cy="700" r="7" fill="${c.line}" opacity="0.6"/>`,

  knit: (c) => `
    <path d="M270 400 Q450 350 630 400 L680 560 L600 590 L600 880 Q450 905 300 880 L300 590 L220 560 Z"
          fill="${c.body}"/>
    <path d="M370 385 Q450 445 530 385" fill="none" stroke="${c.line}" stroke-width="14" opacity="0.55"/>
    <g stroke="${c.line}" stroke-width="3" opacity="0.3">
      <path d="M340 470 L340 860 M400 470 L400 870 M460 470 L460 875 M520 470 L520 870 M580 470 L580 860"/>
    </g>`,

  coat: (c) => `
    <path d="M240 380 L360 315 L450 350 L540 315 L660 380 L700 560 L620 595 L620 930 Q450 955 280 930 L280 595 L200 560 Z"
          fill="${c.body}"/>
    <path d="M360 315 L450 350 L450 940 L280 930 L280 595 L200 560 L240 380 Z" fill="${c.shade}" opacity="0.45"/>
    <rect x="320" y="660" width="110" height="130" rx="8" fill="none" stroke="${c.line}" stroke-width="5" opacity="0.5"/>
    <rect x="470" y="660" width="110" height="130" rx="8" fill="none" stroke="${c.line}" stroke-width="5" opacity="0.5"/>
    <path d="M450 350 L450 940" stroke="${c.line}" stroke-width="5" opacity="0.55"/>`,

  trousers: (c) => `
    <path d="M310 330 L590 330 L610 470 L580 900 L470 900 L450 560 L430 900 L320 900 L290 470 Z" fill="${c.body}"/>
    <path d="M310 330 L590 330 L596 372 L304 372 Z" fill="${c.shade}"/>
    <path d="M450 380 L450 560" stroke="${c.line}" stroke-width="4" opacity="0.45"/>`,

  duffle: (c) => `
    <rect x="190" y="470" width="520" height="300" rx="120" fill="${c.body}"/>
    <path d="M330 470 Q450 380 570 470" fill="none" stroke="${c.line}" stroke-width="16" stroke-linecap="round"/>
    <rect x="380" y="600" width="140" height="20" rx="10" fill="${c.shade}"/>
    <rect x="190" y="600" width="520" height="14" fill="${c.shade}" opacity="0.5"/>`,

  backpack: (c) => `
    <path d="M300 430 Q450 340 600 430 L620 830 Q450 860 280 830 Z" fill="${c.body}"/>
    <path d="M300 430 Q450 340 600 430 L604 510 Q450 450 296 510 Z" fill="${c.shade}"/>
    <rect x="360" y="620" width="180" height="150" rx="14" fill="none" stroke="${c.line}" stroke-width="6" opacity="0.55"/>
    <path d="M340 440 Q330 620 350 780 M560 440 Q570 620 550 780" fill="none" stroke="${c.line}" stroke-width="8" opacity="0.35"/>`,

  wallet: (c) => `
    <rect x="250" y="470" width="400" height="290" rx="22" fill="${c.body}"/>
    <rect x="250" y="470" width="400" height="42" rx="20" fill="${c.shade}"/>
    <g fill="none" stroke="${c.line}" stroke-width="5" opacity="0.5">
      <rect x="300" y="560" width="300" height="46" rx="10"/>
      <rect x="300" y="630" width="300" height="46" rx="10"/>
    </g>`,

  derby: (c) => `
    <path d="M210 690 Q250 560 380 550 Q470 545 540 610 Q620 675 690 690 L700 760 Q450 790 200 760 Z" fill="${c.body}"/>
    <path d="M200 760 Q450 790 700 760 L700 792 Q450 822 200 792 Z" fill="${c.shade}"/>
    <path d="M380 560 Q420 640 400 700" fill="none" stroke="${c.line}" stroke-width="5" opacity="0.55"/>
    <g stroke="${c.line}" stroke-width="4" opacity="0.5">
      <path d="M420 600 L480 622 M416 634 L476 656"/>
    </g>`,

  sneaker: (c) => `
    <path d="M200 700 Q230 580 350 570 Q430 566 500 620 Q590 686 700 700 L706 756 Q450 786 196 756 Z" fill="${c.body}"/>
    <path d="M196 756 Q450 786 706 756 L706 800 Q450 830 196 800 Z" fill="${c.shade}"/>
    <g stroke="${c.line}" stroke-width="5" opacity="0.5">
      <path d="M356 596 L410 626 M348 634 L404 664 M344 672 L398 700"/>
    </g>`,

  mugs: (c) => `
    <path d="M300 540 L640 540 L610 810 Q470 830 330 810 Z" fill="${c.body}"/>
    <ellipse cx="470" cy="540" rx="170" ry="42" fill="${c.shade}"/>
    <path d="M640 590 Q730 620 700 700 Q690 740 620 750" fill="none" stroke="${c.body}" stroke-width="28"/>
    <ellipse cx="470" cy="540" rx="120" ry="28" fill="none" stroke="${c.line}" stroke-width="4" opacity="0.4"/>`,

  throw: (c) => `
    <path d="M230 420 Q450 370 670 420 L680 800 Q450 860 220 800 Z" fill="${c.body}"/>
    <g stroke="${c.line}" stroke-width="4" opacity="0.35">
      <path d="M230 520 Q450 470 672 520 M228 620 Q450 570 674 620 M226 720 Q450 670 676 720"/>
    </g>
    <g stroke="${c.shade}" stroke-width="7" stroke-linecap="round">
      <path d="M260 812 L255 870 M330 826 L327 886 M400 834 L398 894 M470 836 L470 896 M540 834 L542 894 M610 826 L613 886 M670 812 L675 870"/>
    </g>`,

  lamp: (c) => `
    <path d="M330 300 L570 300 L620 470 L280 470 Z" fill="${c.body}"/>
    <ellipse cx="450" cy="470" rx="170" ry="26" fill="${c.shade}"/>
    <rect x="436" y="470" width="28" height="360" fill="${c.body}"/>
    <ellipse cx="450" cy="850" rx="150" ry="34" fill="${c.body}"/>
    <ellipse cx="450" cy="838" rx="150" ry="34" fill="${c.shade}"/>`,

  belt: (c) => `
    <path d="M200 560 L640 560 L640 660 L200 660 Z" fill="${c.body}"/>
    <rect x="620" y="530" width="110" height="160" rx="18" fill="none" stroke="${c.shade}" stroke-width="26"/>
    <path d="M676 530 L676 690" stroke="${c.shade}" stroke-width="16"/>
    <g stroke="${c.line}" stroke-width="4" opacity="0.4">
      <path d="M200 585 L640 585 M200 635 L640 635"/>
    </g>`,

  watch: (c) => `
    <rect x="395" y="270" width="110" height="230" rx="26" fill="${c.shade}"/>
    <rect x="395" y="700" width="110" height="230" rx="26" fill="${c.shade}"/>
    <circle cx="450" cy="600" r="165" fill="${c.body}"/>
    <circle cx="450" cy="600" r="128" fill="${c.shade}" opacity="0.5"/>
    <g stroke="${c.line}" stroke-width="6" stroke-linecap="round">
      <path d="M450 510 L450 540 M540 600 L510 600 M450 690 L450 660 M360 600 L390 600"/>
      <path d="M450 600 L450 522 M450 600 L508 640"/>
    </g>
    <rect x="612" y="576" width="26" height="48" rx="8" fill="${c.shade}"/>`,
}

/** Each palette is a warm ground plus a tonal object, mirroring the site's accent. */
const items = [
  {
    file: 'oxford-shirt',
    shape: 'shirt',
    ground: '#efe7dc',
    body: '#c8d3dd',
    shade: '#a9b8c6',
    line: '#5d6b78',
  },
  {
    file: 'merino-crew',
    shape: 'knit',
    ground: '#e9e3da',
    body: '#8d9c8a',
    shade: '#75846f',
    line: '#3f4a3d',
  },
  {
    file: 'chore-coat',
    shape: 'coat',
    ground: '#f0e9e0',
    body: '#4f6272',
    shade: '#3d4e5c',
    line: '#22303a',
  },
  {
    file: 'chino',
    shape: 'trousers',
    ground: '#ece5db',
    body: '#c2a984',
    shade: '#a68f6d',
    line: '#5f5039',
  },
  {
    file: 'weekender',
    shape: 'duffle',
    ground: '#efe6da',
    body: '#9c6640',
    shade: '#7f5030',
    line: '#4a2d19',
  },
  {
    file: 'daypack',
    shape: 'backpack',
    ground: '#e8e4dc',
    body: '#5c6b52',
    shade: '#48563f',
    line: '#28321f',
  },
  {
    file: 'wallet',
    shape: 'wallet',
    ground: '#f1e9de',
    body: '#7d4b34',
    shade: '#653a27',
    line: '#3a2115',
  },
  {
    file: 'derby',
    shape: 'derby',
    ground: '#ece6dc',
    body: '#5a3626',
    shade: '#43261a',
    line: '#26130c',
  },
  {
    file: 'sneaker',
    shape: 'sneaker',
    ground: '#e9e6e0',
    body: '#f2f0eb',
    shade: '#d6d2c8',
    line: '#8b877e',
  },
  {
    file: 'mug-set',
    shape: 'mugs',
    ground: '#efe8dd',
    body: '#d9cfbe',
    shade: '#bdb09a',
    line: '#6f6555',
  },
  {
    file: 'throw',
    shape: 'throw',
    ground: '#ebe6de',
    body: '#b9c4c0',
    shade: '#9daaa5',
    line: '#5a6663',
  },
  {
    file: 'desk-lamp',
    shape: 'lamp',
    ground: '#ece5d8',
    body: '#b08d4e',
    shade: '#8f7038',
    line: '#4f3d1c',
  },
  {
    file: 'belt',
    shape: 'belt',
    ground: '#f0e9df',
    body: '#6b4a33',
    shade: '#a98a4e',
    line: '#3a2617',
  },
  {
    file: 'watch',
    shape: 'watch',
    ground: '#e9e5dd',
    body: '#3f4750',
    shade: '#2b3238',
    line: '#e5e2dc',
  },
]

function svg({ shape, ground, body, shade, line }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.06"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="34"/>
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.045"/></feComponentTransfer>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="${ground}"/>
  <rect width="${W}" height="${H}" fill="url(#g)"/>

  <ellipse cx="450" cy="960" rx="250" ry="46" fill="#000" opacity="0.16" filter="url(#soft)"/>

  ${shapes[shape]({ body, shade, line })}

  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.55"/>
</svg>
`
}

mkdirSync(OUT_DIR, { recursive: true })

for (const item of items) {
  writeFileSync(join(OUT_DIR, `${item.file}.svg`), svg(item), 'utf8')
}

// Fallback used whenever a product has no imagery at all.
writeFileSync(
  join(process.cwd(), 'public', 'placeholder-product.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
  <rect width="${W}" height="${H}" fill="#ece7de"/>
  <g stroke="#b3a999" stroke-width="8" fill="none" stroke-linecap="round">
    <rect x="300" y="450" width="300" height="300" rx="24"/>
    <path d="M300 660 L400 560 L470 630 L540 570 L600 630"/>
    <circle cx="530" cy="520" r="26"/>
  </g>
</svg>
`,
  'utf8',
)

console.log(`Wrote ${items.length + 1} placeholder images.`)
