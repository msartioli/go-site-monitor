import fs from 'node:fs'
import path from 'node:path'

const file = path.join(process.cwd(), 'components', 'radar-dashboard.js')
let source = fs.readFileSync(file, 'utf8')

if (!source.includes('const visibleOffers = (() => {')) {
  const signature = `function ProductDrawer({ group, history, onClose, onTarget, onRefresh, onRemoveOffer, onToggle, onDelete }) {\n  const stats = groupStats(history, group)`
  const replacement = `function ProductDrawer({ group, history, onClose, onTarget, onRefresh, onRemoveOffer, onToggle, onDelete }) {\n  const stats = groupStats(history, group)\n  const visibleOffers = (() => {\n    const normalizedStore = (offer) => String(offer.store || offer.name || 'Loja').toLowerCase().replace(/[^a-z0-9]/g, '')\n    const ranked = group.offers.slice().sort((a, b) => {\n      const aLive = a.active && a.current_price != null && !a.last_error ? 0 : 1\n      const bLive = b.active && b.current_price != null && !b.last_error ? 0 : 1\n      if (aLive !== bLive) return aLive - bLive\n      const aActive = a.active ? 0 : 1\n      const bActive = b.active ? 0 : 1\n      if (aActive !== bActive) return aActive - bActive\n      const aKnown = a.current_price != null ? 0 : 1\n      const bKnown = b.current_price != null ? 0 : 1\n      if (aKnown !== bKnown) return aKnown - bKnown\n      const priceDiff = (Number(a.current_price) || Number.POSITIVE_INFINITY) - (Number(b.current_price) || Number.POSITIVE_INFINITY)\n      if (Math.abs(priceDiff) > 0.009) return priceDiff\n      return new Date(b.last_checked_at || 0) - new Date(a.last_checked_at || 0)\n    })\n    const byStore = new Map()\n    for (const offer of ranked) {\n      const key = normalizedStore(offer)\n      if (!byStore.has(key)) byStore.set(key, offer)\n    }\n    return [...byStore.values()]\n  })()`
  if (!source.includes(signature)) throw new Error('Offer dedupe patch: ProductDrawer signature not found')
  source = source.replace(signature, replacement)
}

if (!source.includes('Atualização automática')) {
  const startNeedle = `<section><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Lojas monitoradas</h3>`
  const endNeedle = `\n\n          <section><h3 className="mb-3 text-sm font-bold">Últimas mudanças</h3>`
  const start = source.indexOf(startNeedle)
  const end = source.indexOf(endNeedle, start)
  if (start < 0 || end < 0) throw new Error('Offer dedupe patch: monitored stores section not found')

  const section = `<section><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Lojas monitoradas</h3><span className="text-[9px] text-text-muted">{visibleOffers.length} loja{visibleOffers.length === 1 ? '' : 's'}</span></div><div className="grid gap-2">{visibleOffers.map((offer) => { const isFeed = String(offer.price_regex || '').startsWith('FEED:'); return <div key={offer.id} className="rounded-2xl border border-border-soft bg-white/[0.025] p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Store size={14} className="text-accent-primary"/><p className="truncate text-[11px] font-bold">{offer.store || 'Loja'}</p>{isFeed ? <span className="rounded-full border border-accent-primary/15 bg-accent-primary/[0.06] px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.08em] text-accent-primary">descoberta</span> : null}</div><p className="mt-1 text-[8px] text-text-muted">{offer.current_price != null && !offer.last_error ? 'preço válido' : offer.last_error ? 'fonte direta indisponível' : 'sem leitura'} · {dateTime(offer.last_checked_at)}</p></div><p className="text-base font-extrabold">{money(offer.current_price)}</p><div className="flex gap-1.5"><a href={offer.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border-soft px-2.5 py-2 text-[8px] font-bold text-text-secondary">Abrir <ExternalLink size={10}/></a>{isFeed ? <span className="inline-flex items-center rounded-lg border border-accent-primary/15 bg-accent-primary/[0.04] px-2.5 py-2 text-[8px] font-bold text-accent-primary">Atualização automática</span> : <button onClick={() => onRefresh(offer.id)} className="rounded-lg border border-border-soft px-2.5 py-2 text-[8px] font-bold text-text-secondary">Verificar</button>}<button onClick={() => onRemoveOffer(offer.id)} className="rounded-lg border border-danger/15 px-2.5 py-2 text-danger"><Trash2 size={12}/></button></div></div>{offer.last_error ? <p className="mt-2 line-clamp-2 text-[8px] text-warning">{offer.last_error}</p> : null}</div> })}</div></section>`
  source = source.slice(0, start) + section + source.slice(end)
}

fs.writeFileSync(file, source)
console.log('Applied monitored-store dedupe and feed-safe drawer UI.')
