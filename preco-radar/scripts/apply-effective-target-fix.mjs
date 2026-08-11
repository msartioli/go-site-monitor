import fs from 'node:fs'
import path from 'node:path'

const file = path.join(process.cwd(), 'components', 'radar-dashboard.js')
let source = fs.readFileSync(file, 'utf8')

const oldTargets = `  const targets = useMemo(
    () =>
      groups
        .map((group) => ({ group, stats: groupStats(data.history, group) }))
        .filter(({ stats }) => stats.live && stats.current != null && stats.target != null && stats.target > 0)
        .sort((a, b) => {
          const aProgress = a.stats.target / a.stats.current
          const bProgress = b.stats.target / b.stats.current
          if (Math.abs(aProgress - bProgress) > 0.000001) return bProgress - aProgress
          return a.stats.current - a.stats.target - (b.stats.current - b.stats.target)
        })
        .map(({ group }) => group),
    [groups, data.history],
  )`

const newTargets = `  const targets = useMemo(
    () =>
      groups
        .map((group) => {
          const stats = groupStats(data.history, group)
          const couponPrices = (data.coupons || [])
            .filter((coupon) => coupon.matched_group_key === group.key && coupon.estimated_final_price != null)
            .map((coupon) => Number(coupon.estimated_final_price))
            .filter((price) => Number.isFinite(price) && price > 0)
          const effectiveCurrent = Math.min(stats.current ?? Number.POSITIVE_INFINITY, ...couponPrices)
          return { group, stats, effectiveCurrent: Number.isFinite(effectiveCurrent) ? effectiveCurrent : null }
        })
        .filter(({ stats, effectiveCurrent }) => effectiveCurrent != null && stats.target != null && stats.target > 0)
        .sort((a, b) => {
          const aProgress = a.stats.target / a.effectiveCurrent
          const bProgress = b.stats.target / b.effectiveCurrent
          if (Math.abs(aProgress - bProgress) > 0.000001) return bProgress - aProgress
          return a.effectiveCurrent - a.stats.target - (b.effectiveCurrent - b.stats.target)
        })
        .map(({ group }) => group),
    [groups, data.history, data.coupons],
  )`

if (source.includes(oldTargets)) source = source.replace(oldTargets, newTargets)
else if (!source.includes('const couponPrices = (data.coupons || [])')) throw new Error('Effective target patch: targets block not found')

const oldMap = `              {targets.map((group) => {
                const stats = groupStats(history, group)
                const gap = stats.current != null && stats.target != null ? Math.max(0, stats.current - stats.target) : null
                const progress = stats.current && stats.target ? Math.min(100, (stats.target / stats.current) * 100) : 0`
const newMap = `              {targets.map((group) => {
                const baseStats = groupStats(history, group)
                const matchingCoupons = (coupons || [])
                  .filter((coupon) => coupon.matched_group_key === group.key && coupon.estimated_final_price != null)
                  .sort((a, b) => Number(a.estimated_final_price) - Number(b.estimated_final_price))
                const bestCoupon = matchingCoupons[0] || null
                const couponPrice = bestCoupon ? Number(bestCoupon.estimated_final_price) : null
                const couponWins = Number.isFinite(couponPrice) && (baseStats.current == null || couponPrice < baseStats.current)
                const effectiveCurrent = couponWins ? couponPrice : baseStats.current
                const stats = { ...baseStats, current: effectiveCurrent, reached: effectiveCurrent != null && baseStats.target != null && effectiveCurrent <= baseStats.target }
                const sourceLabel = couponWins ? \`${'${bestCoupon.matched_store || bestCoupon.store}'} + ${'${bestCoupon.code}'}\` : (baseStats.offer?.store || 'Sem preço ao vivo')
                const gap = stats.current != null && stats.target != null ? Math.max(0, stats.current - stats.target) : null
                const progress = stats.current && stats.target ? Math.min(100, (stats.target / stats.current) * 100) : 0`

if (source.includes(oldMap)) source = source.replace(oldMap, newMap)
else if (!source.includes('const matchingCoupons = (coupons || [])')) throw new Error('Effective target patch: target card block not found')

source = source.replace(
  'description="O menor preço ao vivo entre as lojas é comparado com a sua meta."',
  'description="O menor preço efetivo — loja ou cupom específico do produto — é comparado com a sua meta."',
)
source = source.replace(
  "{stats.offer?.store || 'Sem preço ao vivo'}",
  '{sourceLabel}',
)

fs.writeFileSync(file, source)
console.log('Applied effective price (live or exact coupon) to target ranking.')
