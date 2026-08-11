import fs from 'node:fs'
import path from 'node:path'

const file = path.join(process.cwd(), 'components', 'radar-dashboard.js')
let source = fs.readFileSync(file, 'utf8')

if (!source.includes('coupons={data.coupons}')) {
  const from = `          <ProductDrawer\n            group={selectedGroup}\n            history={data.history}`
  const to = `          <ProductDrawer\n            group={selectedGroup}\n            history={data.history}\n            coupons={data.coupons}`
  if (!source.includes(from)) throw new Error('Drawer effective price patch: ProductDrawer invocation not found')
  source = source.replace(from, to)
}

if (!source.includes('const drawerMatchingCoupons =')) {
  const from = `function ProductDrawer({ group, history, onClose, onTarget, onRefresh, onRemoveOffer, onToggle, onDelete }) {\n  const stats = groupStats(history, group)`
  const to = `function ProductDrawer({ group, history, coupons, onClose, onTarget, onRefresh, onRemoveOffer, onToggle, onDelete }) {\n  const stats = groupStats(history, group)\n  const drawerMatchingCoupons = (coupons || [])\n    .filter((coupon) => coupon.matched_group_key === group.key && coupon.estimated_final_price != null)\n    .sort((a, b) => Number(a.estimated_final_price) - Number(b.estimated_final_price))\n  const drawerBestCoupon = drawerMatchingCoupons[0] || null\n  const drawerCouponPrice = drawerBestCoupon ? Number(drawerBestCoupon.estimated_final_price) : null\n  const drawerCouponWins = Number.isFinite(drawerCouponPrice) && (stats.current == null || drawerCouponPrice < stats.current)\n  const drawerEffectivePrice = drawerCouponWins ? drawerCouponPrice : stats.current\n  const drawerEffectiveReached = drawerEffectivePrice != null && stats.target != null && drawerEffectivePrice <= stats.target\n  const drawerEffectiveSource = drawerCouponWins\n    ? \`${'${drawerBestCoupon.matched_store || drawerBestCoupon.store}'} + ${'${drawerBestCoupon.code}'}\`\n    : (stats.offer?.store || 'Sem preço válido')\n  const couponForOffer = (offer) =>\n    drawerMatchingCoupons.find((coupon) => coupon.matched_product_id === offer.id) ||\n    drawerMatchingCoupons.find((coupon) => String(coupon.matched_store || coupon.store || '') === String(offer.store || '')) ||\n    null`
  if (!source.includes(from)) throw new Error('Drawer effective price patch: ProductDrawer signature not found')
  source = source.replace(from, to)
}

const oldMetrics = `<div className="grid grid-cols-3 gap-2"><div className="rounded-2xl border border-border-soft bg-white/[0.03] p-3"><p className="text-[8px] uppercase text-text-muted">Melhor preço</p><p className="mt-1 text-sm font-extrabold">{money(stats.current)}</p></div><div className="rounded-2xl border border-border-soft bg-white/[0.03] p-3"><p className="text-[8px] uppercase text-text-muted">Sua meta</p><p className="mt-1 text-sm font-extrabold">{money(stats.target)}</p></div><div className="rounded-2xl border border-border-soft bg-white/[0.03] p-3"><p className="text-[8px] uppercase text-text-muted">Status</p><p className={\`mt-1 text-sm font-extrabold ${'${stats.reached ? \'text-success\' : \'\'}'}\`}>{stats.reached ? 'Na meta' : stats.live ? 'Monitorando' : 'Conhecido'}</p></div></div>`
const newMetrics = `<div className="grid grid-cols-3 gap-2"><div className="rounded-2xl border border-border-soft bg-white/[0.03] p-3"><p className="text-[8px] uppercase text-text-muted">Melhor preço efetivo</p><p className="mt-1 text-sm font-extrabold">{money(drawerEffectivePrice)}</p><p className="mt-1 truncate text-[7px] text-text-muted" title={drawerEffectiveSource}>{drawerEffectiveSource}</p></div><div className="rounded-2xl border border-border-soft bg-white/[0.03] p-3"><p className="text-[8px] uppercase text-text-muted">Sua meta</p><p className="mt-1 text-sm font-extrabold">{money(stats.target)}</p></div><div className="rounded-2xl border border-border-soft bg-white/[0.03] p-3"><p className="text-[8px] uppercase text-text-muted">Status</p><p className={\`mt-1 text-sm font-extrabold ${'${drawerEffectiveReached ? \'text-success\' : \'\'}'}\`}>{drawerEffectiveReached ? 'Na meta' : drawerEffectivePrice != null ? 'Monitorando' : 'Conhecido'}</p></div></div>`
if (source.includes(oldMetrics)) source = source.replace(oldMetrics, newMetrics)
else if (!source.includes('Melhor preço efetivo')) throw new Error('Drawer effective price patch: metrics block not found')

if (!source.includes('const offerCoupon = couponForOffer(offer)')) {
  const from = `{visibleOffers.map((offer) => { const isFeed = String(offer.price_regex || '').startsWith('FEED:'); return <div key={offer.id}`
  const to = `{visibleOffers.map((offer) => { const isFeed = String(offer.price_regex || '').startsWith('FEED:'); const offerCoupon = couponForOffer(offer); return <div key={offer.id}`
  if (!source.includes(from)) throw new Error('Drawer effective price patch: visible offer map not found')
  source = source.replace(from, to)
}

if (!source.includes('offerCoupon ? <p className="mt-0.5 text-[8px] font-bold text-success"')) {
  const from = `<p className="text-base font-extrabold">{money(offer.current_price)}</p><div className="flex gap-1.5"><a href={offer.url}`
  const to = `<div className="text-right"><p className="text-base font-extrabold">{money(offer.current_price)}</p>{offerCoupon ? <p className="mt-0.5 text-[8px] font-bold text-success">{offerCoupon.code}: {money(offerCoupon.estimated_final_price)}</p> : null}</div><div className="flex gap-1.5"><a href={offerCoupon?.matched_offer_url || offer.url}`
  if (!source.includes(from)) throw new Error('Drawer effective price patch: offer price/link block not found')
  source = source.replace(from, to)
}

fs.writeFileSync(file, source)
console.log('Applied exact-coupon effective price to model drawer.')
