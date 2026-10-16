import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ABOUT, COMPANY, DESCRIPTION, DISCLAIMER, FAQ, OPERATED_BY, PAYMENTS, PLANS, REFUND } from './src/lib/siteFacts.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// The site renders in the browser, so crawlers that don't run JavaScript
// (many AI and search bots) used to see only the <title>. This writes the key
// facts into index.html as plain HTML inside #root -- React replaces it on
// mount, and a tiny inline script in index.html hides it the moment JS runs,
// so visitors never see it. Same text the site itself shows (src/lib/siteFacts.js).
function crawlableFacts() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY.product,
    legalName: COMPANY.legalName,
    url: COMPANY.url,
    logo: `${COMPANY.url}/icon-512.png`,
    email: COMPANY.email,
  }
  const appLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: COMPANY.product,
    url: COMPANY.url,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web, iOS',
    publisher: { '@type': 'Organization', name: COMPANY.product, legalName: COMPANY.legalName },
    offers: {
      '@type': 'Offer', price: '9.00', priceCurrency: 'USD',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: '9.00', priceCurrency: 'USD', unitText: 'MONTH', billingDuration: 'P1M' },
    },
  }
  const html = `
    <div id="seo-static">
      <h1>Aurexis — AI stock research with a daily trade plan</h1>
      <p>${esc(DESCRIPTION)}</p>
      <h2>About</h2>
      ${ABOUT.map((p) => `<p>${esc(p)}</p>`).join('\n      ')}
      <h2>Pricing</h2>
      <ul>${PLANS.map((p) => `<li><strong>${esc(p.name)} — ${esc(p.price)}</strong>: ${esc(p.detail)}</li>`).join('')}</ul>
      <p>${esc(PAYMENTS)}</p>
      <h2>Refund policy</h2>
      <p>${esc(REFUND)}</p>
      <h2>Frequently asked questions</h2>
      ${FAQ.map(({ q, a }) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n      ')}
      <h2>Disclaimer</h2>
      <p>${esc(DISCLAIMER)}</p>
      <p>${esc(OPERATED_BY)} Contact: <a href="mailto:${COMPANY.email}">${COMPANY.email}</a></p>
      <nav>
        <a href="/about">About</a> · <a href="/faq">FAQ</a> · <a href="/terms">Terms of Service</a> ·
        <a href="/privacy">Privacy Policy</a> · <a href="/refund">Refund Policy</a> · <a href="/disclaimer">Disclaimer</a> ·
        <a href="/support">Support</a>
      </nav>
    </div>`
  return {
    name: 'aurexis-crawlable-facts',
    transformIndexHtml(src) {
      return src
        .replace('<div id="root"></div>', `<div id="root">${html}\n    </div>`)
        .replace('</head>', `    <script type="application/ld+json">${JSON.stringify(orgLd)}</script>\n    <script type="application/ld+json">${JSON.stringify(appLd)}</script>\n    <script type="application/ld+json">${JSON.stringify(faqLd)}</script>\n  </head>`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), crawlableFacts()],
  server: {
    proxy: {
      '/health': 'http://localhost:8000',
      '/best_pick': 'http://localhost:8000',
      '/best_pick_v2': 'http://localhost:8000',
      '/analyze': 'http://localhost:8000',
      '/top_movers': 'http://localhost:8000',
      '/news': 'http://localhost:8000',
      '/portfolio': 'http://localhost:8000',
      '/watchlist': 'http://localhost:8000',
      '/account': 'http://localhost:8000',
    },
  },
})
