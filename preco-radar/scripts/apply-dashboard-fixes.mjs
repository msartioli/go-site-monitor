import fs from 'node:fs'
import path from 'node:path'

const file = path.join(process.cwd(), 'components', 'radar-dashboard.js')
let source = fs.readFileSync(file, 'utf8')

function replaceOrThrow(from, to, label) {
  if (!source.includes(from)) throw new Error(`Dashboard patch failed: ${label}`)
  source = source.replace(from, to)
}

if (!source.includes('function hasBestPriceVariation(')) {
  replaceOrThrow(
    `function modelImage(group) {`,
    `function hasBestPriceVariation(history, group, days) {
  const daily = buildDailyHistory(history, group, 'best', days)
  if (daily.length < 2) return false
  const first = Number(daily[0].price)
  return daily.some((item) => Math.abs(Number(item.price) - first) > 0.009)
}

function modelImage(group) {`,
    'history variation helper',
  )

  replaceOrThrow(
    `  useEffect(() => {
    if (!historyGroupKey && groups.length) {
      const firstTarget = groups.find((group) => targetForGroup(group) != null)
      setHistoryGroupKey((firstTarget || groups[0]).key)
    }
  }, [groups, historyGroupKey])`,
    `  const historyGroups = useMemo(
    () => groups.filter((group) => hasBestPriceVariation(data.history, group, historyRange)),
    [groups, data.history, historyRange],
  )

  useEffect(() => {
    if (!historyGroups.length) {
      if (historyGroupKey) setHistoryGroupKey('')
      return
    }
    if (!historyGroups.some((group) => group.key === historyGroupKey)) {
      setHistoryGroupKey(historyGroups[0].key)
    }
  }, [historyGroups, historyGroupKey])`,
    'history group selection',
  )

  replaceOrThrow(
    `  const historyGroup = useMemo(
    () => groups.find((group) => group.key === historyGroupKey) || groups[0] || null,
    [groups, historyGroupKey],
  )`,
    `  const historyGroup = useMemo(
    () => historyGroups.find((group) => group.key === historyGroupKey) || historyGroups[0] || null,
    [historyGroups, historyGroupKey],
  )`,
    'history group lookup',
  )

  replaceOrThrow(
    `  const targets = useMemo(
    () => groups.filter((group) => targetForGroup(group) != null),
    [groups],
  )`,
    `  const targets = useMemo(
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
  )`,
    'target proximity ranking',
  )

  replaceOrThrow(
    `                  <OverviewView
                    groups={groups}
                    history={data.history}`,
    `                  <OverviewView
                    groups={groups}
                    historyGroups={historyGroups}
                    history={data.history}`,
    'overview history groups prop',
  )

  replaceOrThrow(
    `                  <HistoryView
                    groups={groups}
                    group={historyGroup}`,
    `                  <HistoryView
                    groups={historyGroups}
                    group={historyGroup}`,
    'full history filtered groups',
  )

  replaceOrThrow(
    `function OverviewView({
  groups,
  history,`,
    `function OverviewView({
  groups,
  historyGroups,
  history,`,
    'overview signature',
  )

  replaceOrThrow(
    `<div className="grid gap-3">
              {targets.slice(0, 5).map((group) => {`,
    `<div className="grid max-h-[620px] gap-3 overflow-y-auto pr-1">
              {targets.map((group) => {`,
    'all targets in proximity order',
  )

  replaceOrThrow(
    `<HistoryCard groups={groups} group={historyGroup} data={historyDaily}`,
    `<HistoryCard groups={historyGroups} group={historyGroup} data={historyDaily}`,
    'overview history filtered groups',
  )

  replaceOrThrow(
    `function HistoryCard({ groups, group, data, stats, store, range, setGroupKey, setStore, setRange, onFullHistory }) {
  const target = group ? targetForGroup(group) : null
  return (`,
    `function HistoryCard({ groups, group, data, stats, store, range, setGroupKey, setStore, setRange, onFullHistory }) {
  const target = group ? targetForGroup(group) : null
  if (!groups.length) {
    return (
      <section className="premium-card p-5 sm:p-6">
        <SectionTitle eyebrow="Coração do radar" title="Histórico de preço" description="Só aparecem modelos cujo menor preço entre lojas realmente mudou no período selecionado." />
        <div className="rounded-2xl border border-dashed border-border-soft p-10 text-center text-xs text-text-muted">
          Nenhum modelo teve oscilação real de preço neste período.
        </div>
      </section>
    )
  }
  return (`,
    'empty history state',
  )

  replaceOrThrow(
    `          <SectionTitle eyebrow="Coração do radar" title="Histórico de preço" description="Passe o mouse ou toque na curva para ver o preço exato em cada data."`,
    `          <SectionTitle eyebrow="Coração do radar" title="Histórico de preço" description="Só entram modelos com oscilação real do menor preço entre lojas no período. Passe o mouse ou toque na curva para ver cada valor."`,
    'history description',
  )
}

if (!source.includes('function couponSavingsEstimate(')) {
  replaceOrThrow(
    `function modelImage(group) {`,
    `function couponSavingsEstimate(coupon, products) {
  const text = String(coupon.validated_discount_text || coupon.discount_text || coupon.title || '')
  const fixedMatch = text.match(/R\\$\\s*([0-9.]+(?:,[0-9]{1,2})?)/i)
  const percentMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\\s*%/)
  const fixed = fixedMatch ? parseMoney(fixedMatch[1]) : null
  const percent = percentMatch ? Number(percentMatch[1].replace(',', '.')) : null

  const live = (products || []).filter((product) => product.active && product.current_price != null && !product.last_error)
  const groupSpecific = coupon.group_key && !String(coupon.group_key).startsWith('campaign:')
  let relevant = groupSpecific ? live.filter((product) => product.group_key === coupon.group_key) : []

  if (!relevant.length && coupon.store) {
    const normalizedStore = String(coupon.store).toLowerCase().replace(/[^a-z0-9]/g, '')
    relevant = live.filter((product) => String(product.store || '').toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedStore)
  }

  const prices = relevant.map((product) => Number(product.current_price)).filter((price) => Number.isFinite(price) && price > 0)
  const referencePrice = prices.length ? (groupSpecific ? Math.min(...prices) : Math.max(...prices)) : null
  const percentSavings = percent != null && referencePrice != null ? referencePrice * (percent / 100) : 0
  const fixedSavings = fixed != null ? fixed : 0
  const savings = Math.max(fixedSavings, percentSavings)

  return {
    savings,
    referencePrice,
    fixed,
    percent,
    estimated: !(coupon.status === 'active' && coupon.validation_status === 'cart_verified'),
  }
}

function modelImage(group) {`,
    'coupon savings helper',
  )
}

if (!source.includes("coupon.status === 'candidate' &&")) {
  replaceOrThrow(
    `  const validCoupons = useMemo(
    () =>
      (data.coupons || []).filter(
        (coupon) =>
          coupon.status === 'active' &&
          coupon.validation_status === 'cart_verified' &&
          coupon.validation_expires_at &&
          new Date(coupon.validation_expires_at) > new Date(),
      ),
    [data.coupons],
  )`,
    `  const validCoupons = useMemo(() => {
    const now = Date.now()
    const candidateCutoff = now - 14 * 24 * 60 * 60 * 1000
    return (data.coupons || [])
      .filter((coupon) => {
        if (coupon.status === 'active' && coupon.validation_status === 'cart_verified') {
          return coupon.validation_expires_at && new Date(coupon.validation_expires_at).getTime() > now
        }
        return (
          coupon.status === 'candidate' &&
          ['official_eligible', 'official_campaign', 'aggregator_recent', 'source_verified', 'needs_revalidation'].includes(coupon.validation_status) &&
          coupon.last_seen_at &&
          new Date(coupon.last_seen_at).getTime() >= candidateCutoff
        )
      })
      .sort((a, b) => {
        const aSavings = couponSavingsEstimate(a, data.products).savings
        const bSavings = couponSavingsEstimate(b, data.products).savings
        if (Math.abs(aSavings - bSavings) > 0.01) return bSavings - aSavings
        const aConfirmed = a.status === 'active' && a.validation_status === 'cart_verified' ? 0 : 1
        const bConfirmed = b.status === 'active' && b.validation_status === 'cart_verified' ? 0 : 1
        if (aConfirmed !== bConfirmed) return aConfirmed - bConfirmed
        const aOfficial = a.source_kind === 'official' ? 0 : 1
        const bOfficial = b.source_kind === 'official' ? 0 : 1
        if (aOfficial !== bOfficial) return aOfficial - bOfficial
        return new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0)
      })
  }, [data.coupons, data.products])`,
    'coupon visibility policy',
  )

  const start = source.indexOf('function CouponsView({ coupons, setToast }) {')
  const end = source.indexOf('\nfunction ModelsView(', start)
  if (start < 0 || end < 0) throw new Error('Dashboard patch failed: CouponsView boundaries')
  const couponsView = `function CouponsView({ coupons, setToast }) {
  const confirmed = coupons.filter((coupon) => coupon.status === 'active' && coupon.validation_status === 'cart_verified')
  const candidates = coupons.filter((coupon) => !(coupon.status === 'active' && coupon.validation_status === 'cart_verified'))

  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden rounded-[28px] border border-border-soft bg-hero-gradient p-6 sm:p-8">
        <div className="absolute inset-y-0 right-0 w-[52%] opacity-30"><Image src={SHOP_IMAGE} alt="Compras online" fill sizes="55vw" className="object-cover" /></div>
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/90 to-transparent" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-warning/20 bg-warning/[0.07] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-warning"><TicketPercent size={12}/> Radar de cupons</div>
          <h1 className="text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">Do maior desconto potencial para o menor.</h1>
          <p className="mt-3 max-w-xl text-xs leading-6 text-text-secondary/80">A ordem considera a economia em reais nos produtos monitorados. Desconto percentual usa o preço ao vivo do produto/loja; desconto fixo usa o valor anunciado. Candidatos continuam marcados como estimativa até o carrinho confirmar.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[9px] font-bold"><span className="rounded-full bg-success/10 px-3 py-1.5 text-success">{confirmed.length} confirmado{confirmed.length === 1 ? '' : 's'}</span><span className="rounded-full bg-warning/10 px-3 py-1.5 text-warning">{candidates.length} para testar</span></div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {coupons.map((coupon, index) => {
          const isConfirmed = coupon.status === 'active' && coupon.validation_status === 'cart_verified'
          const isOfficial = coupon.source_kind === 'official'
          const label = isConfirmed ? '✓ Validado no carrinho' : isOfficial ? '★ Campanha oficial — testar' : '⚡ Encontrado recentemente — testar'
          const accent = isConfirmed ? 'text-success' : 'text-warning'
          const panel = isConfirmed ? 'border-success/15 bg-success/[0.025]' : 'border-warning/15 bg-warning/[0.025]'
          const estimate = couponSavingsEstimate(coupon, window.__PRECO_RADAR_PRODUCTS__ || [])
          return (
            <article key={coupon.id} className={\`premium-card border \${panel} p-5\`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="mb-1 flex items-center gap-2"><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/[0.07] px-1.5 text-[9px] font-extrabold text-text-secondary">#{index + 1}</span><p className={\`text-[9px] font-extrabold uppercase tracking-[0.12em] \${accent}\`}>{label}</p></div><h3 className="mt-2 line-clamp-2 text-base font-bold">{coupon.title || 'Cupom encontrado'}</h3><p className="mt-1 text-[10px] text-text-muted">{coupon.store} · {coupon.model || 'Produtos selecionados'}</p></div><TicketPercent className={accent} />
              </div>
              <div className="mt-5 flex items-center gap-2"><code className="flex-1 rounded-xl border border-dashed border-accent-primary/25 bg-accent-primary/[0.05] px-4 py-3 text-center text-lg font-black tracking-[0.12em] text-accent-primary">{coupon.code}</code><button onClick={async () => { try { await navigator.clipboard.writeText(coupon.code); setToast('Cupom copiado — teste no carrinho') } catch { setToast(\`Cupom: \${coupon.code}\`) } }} className="grid h-12 w-12 place-items-center rounded-xl border border-border-soft bg-white/[0.035] text-text-secondary"><Copy size={17}/></button></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-border-soft bg-bg-primary/35 p-3"><p className="text-[8px] uppercase tracking-[0.08em] text-text-muted">Desconto anunciado</p><p className="mt-1 text-[11px] font-bold text-text-secondary">{coupon.validated_discount_text || coupon.discount_text || 'Condição promocional encontrada'}</p></div><div className="rounded-xl border border-accent-primary/15 bg-accent-primary/[0.045] p-3"><p className="text-[8px] uppercase tracking-[0.08em] text-text-muted">Economia potencial</p><p className="mt-1 text-base font-extrabold text-accent-primary">{estimate.savings > 0 ? money(estimate.savings) : '—'}</p><p className="mt-1 text-[8px] text-text-muted">{isConfirmed ? 'confirmada' : 'estimada; depende da elegibilidade'}</p></div></div>
              {!isConfirmed ? <p className="mt-3 text-[9px] leading-4 text-text-muted">Ainda não conte com o desconto no preço final: abra a campanha/produto e teste o código no carrinho.</p> : null}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[9px] text-text-muted"><span>{isConfirmed ? \`validado \${dateTime(coupon.cart_verified_at)}\` : \`visto \${dateTime(coupon.last_seen_at)}\`}</span><span>{isOfficial ? 'fonte oficial' : 'fonte agregadora'}</span></div>
              {coupon.offer_url || coupon.source_url ? <a href={coupon.offer_url || coupon.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold text-accent-primary">{coupon.offer_url && coupon.offer_url !== coupon.source_url ? 'Abrir produto' : 'Abrir campanha'} <ExternalLink size={12}/></a> : null}
            </article>
          )
        })}
        {!coupons.length ? <div className="lg:col-span-2 rounded-3xl border border-dashed border-border-soft bg-white/[0.02] p-14 text-center"><TicketPercent className="mx-auto text-text-muted" size={34}/><h3 className="mt-4 text-sm font-bold">Nenhum código recente encontrado</h3><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-text-muted">O radar verifica páginas de produto, campanhas oficiais e fontes agregadoras. Quando um código aparecer, ele entra aqui com o nível de confiança correto.</p></div> : null}
      </div>
    </div>
  )
}
`
  source = source.slice(0, start) + couponsView + source.slice(end)
}

if (!source.includes('window.__PRECO_RADAR_PRODUCTS__')) {
  replaceOrThrow(
    `  const groups = useMemo(() => buildGroups(data.products), [data.products])`,
    `  const groups = useMemo(() => buildGroups(data.products), [data.products])

  useEffect(() => {
    window.__PRECO_RADAR_PRODUCTS__ = data.products || []
    return () => { delete window.__PRECO_RADAR_PRODUCTS__ }
  }, [data.products])`,
    'coupon product price bridge',
  )
}

fs.writeFileSync(file, source)
console.log('Applied dashboard ranking, history and coupon savings-order fixes.')
