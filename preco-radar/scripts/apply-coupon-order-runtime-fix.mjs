import fs from 'node:fs'
import path from 'node:path'

const file = path.join(process.cwd(), 'components', 'radar-dashboard.js')
let source = fs.readFileSync(file, 'utf8')

function replaceIfPresent(from, to) {
  if (source.includes(from)) source = source.replace(from, to)
}

replaceIfPresent(
  `<CouponsView coupons={validCoupons} setToast={setToast} />`,
  `<CouponsView coupons={validCoupons} products={data.products} setToast={setToast} />`,
)
replaceIfPresent(
  `function CouponsView({ coupons, setToast }) {`,
  `function CouponsView({ coupons, products, setToast }) {`,
)
replaceIfPresent(
  `couponSavingsEstimate(coupon, window.__PRECO_RADAR_PRODUCTS__ || [])`,
  `couponSavingsEstimate(coupon, products)`,
)

fs.writeFileSync(file, source)
console.log('Wired coupon savings estimates directly to live product data.')
