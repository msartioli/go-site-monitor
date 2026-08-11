import fs from 'node:fs'
import path from 'node:path'

const file = path.join(process.cwd(), 'components', 'radar-dashboard.js')
let source = fs.readFileSync(file, 'utf8')

source = source.replace(
  "['official_eligible', 'official_campaign', 'aggregator_recent', 'source_verified', 'needs_revalidation']",
  "['official_eligible', 'official_campaign', 'aggregator_recent', 'source_verified', 'needs_revalidation', 'deal_reported']",
)

source = source.replace(
  "const estimate = couponSavingsEstimate(coupon, window.__PRECO_RADAR_PRODUCTS__ || [])",
  "const fallbackEstimate = couponSavingsEstimate(coupon, window.__PRECO_RADAR_PRODUCTS__ || [])\n          const estimate = { savings: Number(coupon.estimated_savings ?? fallbackEstimate.savings ?? 0), finalPrice: coupon.estimated_final_price != null ? Number(coupon.estimated_final_price) : null }",
)

source = source.replace(
  /\{coupon\.offer_url && coupon\.offer_url !== coupon\.source_url \? 'Abrir produto' : 'Abrir campanha'\}/g,
  "Abrir produto e testar cupom",
)
source = source.replace(/>Abrir produto <ExternalLink/g, '>Abrir produto e testar cupom <ExternalLink')
source = source.replace(/>Abrir campanha <ExternalLink/g, '>Abrir produto e testar cupom <ExternalLink')

source = source.replace(
  "{coupon.store} · {coupon.model || 'Produtos selecionados'}",
  "{coupon.matched_store || coupon.store} · {coupon.matched_group_name || coupon.model || 'Produto monitorado'}",
)

source = source.replace(
  "{estimate.savings > 0 ? money(estimate.savings) : '—'}",
  "{estimate.savings > 0 ? money(estimate.savings) : '—'}{estimate.finalPrice != null ? <span className=\"ml-2 text-[9px] font-medium text-text-muted\">→ final estimado {money(estimate.finalPrice)}</span> : null}",
)

fs.writeFileSync(file, source)
console.log('Applied exact-product coupon UI fix.')
