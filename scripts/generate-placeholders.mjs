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

  tee: (c) => `
    <path d="M250 390 L360 330 Q450 392 540 330 L650 390 L700 540 L615 575 L615 880 Q450 905 285 880 L285 575 L200 540 Z"
          fill="${c.body}"/>
    <path d="M360 330 Q450 400 540 330 L515 312 Q450 366 385 312 Z" fill="${c.shade}"/>
    <rect x="330" y="580" width="110" height="120" rx="6" fill="none" stroke="${c.line}" stroke-width="5" opacity="0.5"/>`,

  jacket: (c) => `
    <path d="M250 370 L365 315 L450 350 L535 315 L650 370 L692 540 L612 575 L612 830 Q450 858 288 830 L288 575 L208 540 Z"
          fill="${c.body}"/>
    <path d="M365 315 L450 350 L450 845 L288 830 L288 575 L208 540 L250 370 Z" fill="${c.shade}" opacity="0.4"/>
    <rect x="288" y="790" width="324" height="38" fill="${c.shade}" opacity="0.6"/>
    <g fill="none" stroke="${c.line}" stroke-width="5" opacity="0.5">
      <rect x="330" y="520" width="100" height="88" rx="6"/>
      <rect x="470" y="520" width="100" height="88" rx="6"/>
    </g>
    <path d="M450 350 L450 845" stroke="${c.line}" stroke-width="5" opacity="0.55"/>`,

  henley: (c) => `
    <path d="M275 395 Q450 345 625 395 L678 555 L598 585 L598 875 Q450 900 302 875 L302 585 L222 555 Z"
          fill="${c.body}"/>
    <path d="M380 378 Q450 428 520 378 L520 358 Q450 404 380 358 Z" fill="${c.shade}"/>
    <path d="M424 410 L424 570 M476 410 L476 570" stroke="${c.line}" stroke-width="5" opacity="0.5"/>
    <g fill="${c.line}" opacity="0.6">
      <circle cx="450" cy="440" r="8"/>
      <circle cx="450" cy="495" r="8"/>
      <circle cx="450" cy="550" r="8"/>
    </g>`,

  boot: (c) => `
    <path d="M290 430 L520 430 L540 620 Q620 682 700 700 L705 760 Q450 792 250 760 L262 620 Z" fill="${c.body}"/>
    <path d="M290 430 L520 430 L516 474 L294 474 Z" fill="${c.shade}"/>
    <path d="M250 760 Q450 792 705 760 L705 802 Q450 834 250 802 Z" fill="${c.shade}"/>
    <g stroke="${c.line}" stroke-width="4" opacity="0.5">
      <path d="M330 512 L472 532 M326 566 L468 586"/>
    </g>`,

  socks: (c) => `
    <g fill="${c.body}">
      <path d="M250 380 L370 380 L370 660 Q370 700 410 714 L480 740 L446 832 L350 796 Q250 758 250 660 Z"/>
      <path d="M470 380 L590 380 L590 660 Q590 700 630 714 L700 740 L666 832 L570 796 Q470 758 470 660 Z"/>
    </g>
    <g fill="${c.shade}">
      <rect x="250" y="380" width="120" height="54"/>
      <rect x="470" y="380" width="120" height="54"/>
    </g>
    <g stroke="${c.line}" stroke-width="4" opacity="0.32">
      <path d="M282 452 L282 690 M312 452 L312 700 M342 452 L342 700 M502 452 L502 690 M532 452 L532 700 M562 452 L562 700"/>
    </g>`,

  tote: (c) => `
    <path d="M240 470 L660 470 L620 850 L280 850 Z" fill="${c.body}"/>
    <path d="M340 470 Q340 352 450 352 Q560 352 560 470" fill="none" stroke="${c.line}" stroke-width="16" stroke-linecap="round"/>
    <rect x="252" y="470" width="396" height="34" fill="${c.shade}"/>
    <path d="M262 654 L638 654" stroke="${c.shade}" stroke-width="16" opacity="0.7"/>`,

  doppkit: (c) => `
    <rect x="230" y="530" width="440" height="240" rx="46" fill="${c.body}"/>
    <path d="M256 578 L644 578" stroke="${c.shade}" stroke-width="18" stroke-linecap="round"/>
    <g stroke="${c.line}" stroke-width="4" opacity="0.4">
      <path d="M290 566 L290 590 M330 566 L330 590 M370 566 L370 590 M410 566 L410 590 M450 566 L450 590 M490 566 L490 590 M530 566 L530 590 M570 566 L570 590"/>
    </g>
    <rect x="618" y="562" width="52" height="26" rx="12" fill="${c.shade}"/>`,

  skillet: (c) => `
    <path d="M600 588 L768 522 Q800 510 812 538 Q824 566 792 578 L624 644 Z" fill="${c.body}"/>
    <circle cx="792" cy="550" r="13" fill="none" stroke="${c.line}" stroke-width="5" opacity="0.5"/>
    <circle cx="420" cy="620" r="205" fill="${c.body}"/>
    <circle cx="420" cy="620" r="158" fill="${c.shade}" opacity="0.55"/>
    <circle cx="420" cy="620" r="112" fill="none" stroke="${c.line}" stroke-width="4" opacity="0.35"/>`,

  kettle: (c) => `
    <path d="M320 620 Q202 616 204 486 Q206 404 268 392 Q300 388 306 420" fill="none" stroke="${c.body}" stroke-width="26" stroke-linecap="round"/>
    <path d="M604 620 Q694 642 694 720 Q694 780 614 794" fill="none" stroke="${c.body}" stroke-width="26" stroke-linecap="round"/>
    <path d="M300 620 Q300 562 360 562 L540 562 Q600 562 600 620 L578 812 Q450 842 322 812 Z" fill="${c.body}"/>
    <ellipse cx="450" cy="562" rx="150" ry="30" fill="${c.shade}"/>
    <circle cx="450" cy="536" r="22" fill="${c.shade}"/>
    <path d="M322 700 Q450 726 578 700" fill="none" stroke="${c.line}" stroke-width="4" opacity="0.35"/>`,

  candles: (c) => `
    <g fill="${c.body}">
      <rect x="270" y="520" width="120" height="330"/>
      <rect x="410" y="450" width="120" height="400"/>
      <rect x="550" y="580" width="120" height="270"/>
    </g>
    <g fill="${c.shade}">
      <ellipse cx="330" cy="520" rx="60" ry="16"/>
      <ellipse cx="470" cy="450" rx="60" ry="16"/>
      <ellipse cx="610" cy="580" rx="60" ry="16"/>
    </g>
    <g stroke="${c.line}" stroke-width="6" stroke-linecap="round">
      <path d="M330 520 L330 484 M470 450 L470 414 M610 580 L610 544"/>
    </g>`,

  beanie: (c) => `
    <circle cx="450" cy="376" r="46" fill="${c.shade}"/>
    <path d="M290 626 Q290 404 450 404 Q610 404 610 626 Z" fill="${c.body}"/>
    <rect x="268" y="620" width="364" height="112" rx="14" fill="${c.shade}"/>
    <g stroke="${c.line}" stroke-width="3" opacity="0.32">
      <path d="M310 632 L310 722 M350 632 L350 722 M390 632 L390 722 M430 632 L430 722 M470 632 L470 722 M510 632 L510 722 M550 632 L550 722 M590 632 L590 722"/>
    </g>`,

  cap: (c) => `
    <path d="M620 634 Q782 640 798 700 Q702 714 610 700 Z" fill="${c.shade}"/>
    <path d="M270 646 Q270 428 450 428 Q630 428 630 646 Z" fill="${c.body}"/>
    <circle cx="450" cy="426" r="15" fill="${c.shade}"/>
    <g stroke="${c.line}" stroke-width="4" opacity="0.35">
      <path d="M450 430 L450 646 M360 442 Q340 540 344 646 M540 442 Q560 540 556 646"/>
    </g>`,
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
  {
    file: 'pocket-tee',
    shape: 'tee',
    ground: '#f0eae1',
    body: '#d3ccbc',
    shade: '#b7ae9a',
    line: '#655f52',
  },
  {
    file: 'denim-jacket',
    shape: 'jacket',
    ground: '#ece7dd',
    body: '#4a6383',
    shade: '#38506d',
    line: '#1e2c3f',
  },
  {
    file: 'henley',
    shape: 'henley',
    ground: '#eee7dc',
    body: '#9a7f6a',
    shade: '#816856',
    line: '#463629',
  },
  {
    file: 'corduroy-trouser',
    shape: 'trousers',
    ground: '#ebe5da',
    body: '#8a6f4c',
    shade: '#6f5839',
    line: '#3d2f1c',
  },
  {
    file: 'chukka-boot',
    shape: 'boot',
    ground: '#ede6db',
    body: '#a37b52',
    shade: '#856140',
    line: '#4b3520',
  },
  {
    file: 'deck-shoe',
    shape: 'sneaker',
    ground: '#e8e6df',
    body: '#3c4a5c',
    shade: '#2a3646',
    line: '#dcd8d0',
  },
  {
    file: 'wool-socks',
    shape: 'socks',
    ground: '#efe9df',
    body: '#7b8478',
    shade: '#636c60',
    line: '#333a30',
  },
  {
    file: 'tote',
    shape: 'tote',
    ground: '#ece7de',
    body: '#d5cdb9',
    shade: '#b5ab93',
    line: '#5f5847',
  },
  {
    file: 'dopp-kit',
    shape: 'doppkit',
    ground: '#f0e9df',
    body: '#6f5b46',
    shade: '#584634',
    line: '#2f2317',
  },
  {
    file: 'skillet',
    shape: 'skillet',
    ground: '#ebe6dc',
    body: '#3d3c3a',
    shade: '#2a2928',
    line: '#dedad2',
  },
  {
    file: 'kettle',
    shape: 'kettle',
    ground: '#e9e6de',
    body: '#5d7d78',
    shade: '#46615d',
    line: '#dfe4e1',
  },
  {
    file: 'candles',
    shape: 'candles',
    ground: '#ede6d9',
    body: '#e0c98f',
    shade: '#c3aa6c',
    line: '#6b5730',
  },
  {
    file: 'beanie',
    shape: 'beanie',
    ground: '#ece6dd',
    body: '#8c4f43',
    shade: '#733c32',
    line: '#40201a',
  },
  {
    file: 'cap',
    shape: 'cap',
    ground: '#eee8de',
    body: '#4c5347',
    shade: '#3a4036',
    line: '#1e221b',
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
