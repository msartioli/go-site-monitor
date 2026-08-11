'use client'

import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Cpu,
  ExternalLink,
  HardDrive,
  LayoutDashboard,
  LineChart,
  Laptop,
  Menu,
  MemoryStick,
  Pause,
  Play,
  Plus,
  Radar,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  TicketPercent,
  Trash2,
  TrendingDown,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import PriceHistoryChart from './price-history-chart'

const DATA_URL = 'https://sziaumkwyxodhtuaxlhg.supabase.co/functions/v1/dashboard-data'
const MANAGE_URL = 'https://sziaumkwyxodhtuaxlhg.supabase.co/functions/v1/manage-products'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1800&q=86'
const DATA_IMAGE =
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=82'
const SHOP_IMAGE =
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=82'

const money = (value) =>
  value == null || Number.isNaN(Number(value))
    ? '—'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2,
      }).format(Number(value))

const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—'

const dateOnly = (value) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : '—'

const dateKey = (value) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))

function parseMoney(value) {
  if (!value) return null
  const parsed = Number(
    String(value)
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, ''),
  )
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function buildGroups(products) {
  const map = new Map()
  for (const product of products || []) {
    const key = product.group_key || product.model || product.id
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: product.group_name || product.name,
        model: product.model || '',
        gpu: product.gpu || '',
        processor: product.processor || '',
        ram: product.ram || '',
        storage: product.storage || '',
        rank: Number(product.recommendation_rank ?? 100),
        offers: [],
      })
    }
    const group = map.get(key)
    group.offers.push(product)
    group.gpu ||= product.gpu || ''
    group.processor ||= product.processor || ''
    group.ram ||= product.ram || ''
    group.storage ||= product.storage || ''
  }
  return [...map.values()]
}

function historyForOffer(history, offerId) {
  return (history || [])
    .filter((item) => item.product_id === offerId)
    .map((item) => ({ price: Number(item.price), checkedAt: item.checked_at }))
    .sort((a, b) => new Date(a.checkedAt) - new Date(b.checkedAt))
}

function latestRealChange(history, offer) {
  const source = historyForOffer(history, offer.id)
  const distinct = []
  for (const item of source) {
    if (!Number.isFinite(item.price)) continue
    if (!distinct.length || Math.abs(distinct.at(-1).price - item.price) > 0.009) {
      distinct.push(item)
    }
  }
  if (distinct.length < 2) return null
  const before = distinct.at(-2)
  const after = distinct.at(-1)
  const delta = after.price - before.price
  if (Math.abs(delta) < 0.01) return null
  return {
    offer,
    before: before.price,
    after: after.price,
    delta,
    pct: (delta / before.price) * 100,
    checkedAt: after.checkedAt,
  }
}

function groupChanges(history, group) {
  return group.offers
    .map((offer) => latestRealChange(history, offer))
    .filter(Boolean)
    .sort((a, b) => {
      const aType = a.pct < 0 ? 0 : 1
      const bType = b.pct < 0 ? 0 : 1
      if (aType !== bType) return aType - bType
      return aType === 0 ? a.pct - b.pct : b.pct - a.pct
    })
}

function bestOffer(group) {
  const active = group.offers.filter((offer) => offer.active)
  const live = active
    .filter((offer) => offer.current_price != null && !offer.last_error)
    .sort((a, b) => Number(a.current_price) - Number(b.current_price))
  const known = active
    .filter((offer) => offer.current_price != null)
    .sort((a, b) => Number(a.current_price) - Number(b.current_price))
  return { offer: live[0] || known[0] || null, live: Boolean(live[0]) }
}

function targetForGroup(group) {
  const offer = group.offers.find((item) => item.target_price != null)
  return offer ? Number(offer.target_price) : null
}

function groupStats(history, group) {
  const best = bestOffer(group)
  const target = targetForGroup(group)
  const changes = groupChanges(history, group)
  const drop = changes.find((item) => item.pct < 0) || null
  const current = best.offer ? Number(best.offer.current_price) : null
  return {
    ...best,
    target,
    changes,
    drop,
    current,
    reached: current != null && target != null && current <= target,
  }
}

function buildDailyHistory(history, group, offerId, days) {
  if (!group) return []
  const ids = new Set(offerId === 'best' ? group.offers.map((offer) => offer.id) : [offerId])
  const cutoff = Date.now() - Number(days) * 86400000
  const byDay = new Map()

  for (const item of history || []) {
    if (!ids.has(item.product_id)) continue
    if (new Date(item.checked_at).getTime() < cutoff) continue
    const price = Number(item.price)
    if (!Number.isFinite(price)) continue
    const key = dateKey(item.checked_at)
    const offer = group.offers.find((entry) => entry.id === item.product_id)
    const current = byDay.get(key)
    if (!current || price < current.price) {
      byDay.set(key, {
        key,
        iso: item.checked_at,
        price,
        store: offer?.store || 'Loja',
        readings: (current?.readings || 0) + 1,
      })
    } else {
      current.readings = (current.readings || 0) + 1
    }
  }

  return [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key))
}

function modelImage(group) {
  if (group?.gpu?.toLowerCase().includes('apple') || group?.processor?.startsWith('Apple')) return HERO_IMAGE
  if (group?.gpu?.includes('RTX')) return DATA_IMAGE
  return SHOP_IMAGE
}

function HardwareSpecs({ group, compact = false }) {
  const specs = [
    { label: 'Processador', value: group.processor || '—', icon: Cpu },
    { label: 'RAM', value: group.ram || '—', icon: MemoryStick },
    { label: 'SSD', value: group.storage || '—', icon: HardDrive },
    { label: 'GPU', value: group.gpu || '—', icon: Zap },
  ]

  return (
    <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4'} gap-2`}>
      {specs.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-xl border border-border-soft bg-white/[0.035] px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-text-muted">
            <Icon size={12} /> {label}
          </div>
          <div className="truncate text-[11px] font-semibold text-text-secondary" title={value}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, detail, accent = 'cyan' }) {
  const accentClasses = {
    cyan: 'from-accent-primary/20 to-accent-primary/[0.03] text-accent-primary',
    green: 'from-success/20 to-success/[0.03] text-success',
    purple: 'from-accent-secondary/20 to-accent-secondary/[0.03] text-accent-secondary',
    amber: 'from-warning/20 to-warning/[0.03] text-warning',
  }

  return (
    <motion.article
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      className="premium-card p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-text-primary sm:text-3xl">{value}</p>
          <p className="mt-1 max-w-[220px] truncate text-[10px] text-text-muted">{detail}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${accentClasses[accent]}`}>
          <Icon size={20} />
        </div>
      </div>
    </motion.article>
  )
}

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-accent-primary/80">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-text-primary sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-xs text-text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="grid gap-4">
      <div className="loading-shimmer h-72 rounded-3xl border border-border-soft" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="loading-shimmer h-32 rounded-2xl border border-border-soft" />
        ))}
      </div>
    </div>
  )
}

export default function RadarDashboard() {
  const [data, setData] = useState({ products: [], history: [], coupons: [], generated_at: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeView, setActiveView] = useState('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [selectedGroupKey, setSelectedGroupKey] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [targetGroupKey, setTargetGroupKey] = useState(null)
  const [toast, setToast] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [changeFilter, setChangeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [gpuFilter, setGpuFilter] = useState('all')
  const [sortBy, setSortBy] = useState('rank')
  const [historyGroupKey, setHistoryGroupKey] = useState('')
  const [historyStore, setHistoryStore] = useState('best')
  const [historyRange, setHistoryRange] = useState('30')

  const groups = useMemo(() => buildGroups(data.products), [data.products])

  useEffect(() => {
    if (!historyGroupKey && groups.length) {
      const firstTarget = groups.find((group) => targetForGroup(group) != null)
      setHistoryGroupKey((firstTarget || groups[0]).key)
    }
  }, [groups, historyGroupKey])

  useEffect(() => {
    setHistoryStore('best')
  }, [historyGroupKey])

  const selectedGroup = useMemo(
    () => groups.find((group) => group.key === selectedGroupKey) || null,
    [groups, selectedGroupKey],
  )

  const historyGroup = useMemo(
    () => groups.find((group) => group.key === historyGroupKey) || groups[0] || null,
    [groups, historyGroupKey],
  )

  const allChanges = useMemo(() => {
    const result = []
    for (const group of groups) {
      for (const change of groupChanges(data.history, group)) result.push({ ...change, group })
    }
    return result.sort((a, b) => {
      const aType = a.pct < 0 ? 0 : 1
      const bType = b.pct < 0 ? 0 : 1
      if (aType !== bType) return aType - bType
      return aType === 0 ? a.pct - b.pct : b.pct - a.pct
    })
  }, [groups, data.history])

  const drops = useMemo(() => allChanges.filter((change) => change.pct < 0), [allChanges])

  const validCoupons = useMemo(
    () =>
      (data.coupons || []).filter(
        (coupon) =>
          coupon.status === 'active' &&
          coupon.validation_status === 'cart_verified' &&
          coupon.validation_expires_at &&
          new Date(coupon.validation_expires_at) > new Date(),
      ),
    [data.coupons],
  )

  const historyDaily = useMemo(
    () => buildDailyHistory(data.history, historyGroup, historyStore, historyRange),
    [data.history, historyGroup, historyStore, historyRange],
  )

  const historyStats = useMemo(() => {
    if (!historyDaily.length) return null
    const prices = historyDaily.map((item) => Number(item.price))
    const first = prices[0]
    const last = prices.at(-1)
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      first,
      delta: last - first,
    }
  }, [historyDaily])

  const targets = useMemo(
    () => groups.filter((group) => targetForGroup(group) != null),
    [groups],
  )

  const reachedTargets = useMemo(
    () => targets.filter((group) => groupStats(data.history, group).reached),
    [targets, data.history],
  )

  const liveOffers = useMemo(
    () => data.products.filter((offer) => offer.active && offer.current_price != null && !offer.last_error),
    [data.products],
  )

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      setError('')
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      setData({
        products: payload.products || [],
        history: payload.history || [],
        coupons: payload.coupons || [],
        generated_at: payload.generated_at || new Date().toISOString(),
      })
    } catch (loadError) {
      setError(`Não foi possível carregar os dados agora. ${loadError.message}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(true)
    const timer = window.setInterval(() => load(true), 60000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function manage(payload) {
    const response = await fetch(MANAGE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'Falha na operação')
    return result
  }

  const navItems = [
    { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'changes', label: 'Quedas', icon: TrendingDown, badge: allChanges.length },
    { id: 'history', label: 'Histórico', icon: LineChart },
    { id: 'coupons', label: 'Cupons', icon: TicketPercent, badge: validCoupons.length },
    { id: 'models', label: 'Modelos', icon: Laptop, badge: groups.length },
  ]

  function navigate(view) {
    setActiveView(view)
    setMobileNav(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const heroBestDrop = drops[0]

  const visibleChanges = allChanges.filter((change) => {
    if (changeFilter === 'drops') return change.pct < 0
    if (changeFilter === 'rises') return change.pct > 0
    return true
  })

  const visibleModels = useMemo(() => {
    let result = groups.filter((group) => {
      const haystack = `${group.name} ${group.model} ${group.processor} ${group.ram} ${group.storage} ${group.gpu}`.toLowerCase()
      const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase())
      const matchesGpu =
        gpuFilter === 'all' ||
        (gpuFilter === 'apple' ? group.gpu.toLowerCase().includes('apple') : group.gpu.includes(gpuFilter))
      return matchesSearch && matchesGpu
    })

    result = [...result].sort((a, b) => {
      const aStats = groupStats(data.history, a)
      const bStats = groupStats(data.history, b)
      if (sortBy === 'price') return (aStats.current ?? 1e12) - (bStats.current ?? 1e12)
      if (sortBy === 'drop') return (aStats.drop?.pct ?? 999) - (bStats.drop?.pct ?? 999)
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return a.rank - b.rank || a.name.localeCompare(b.name)
    })

    return result
  }, [groups, search, gpuFilter, sortBy, data.history])

  return (
    <div className="min-h-screen text-text-primary">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[270px] border-r border-border-soft bg-bg-primary/90 px-4 py-5 backdrop-blur-2xl lg:flex lg:flex-col">
        <button onClick={() => navigate('overview')} className="flex items-center gap-3 px-2 text-left">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-gradient text-bg-primary shadow-glow-accent">
            <Radar size={23} />
          </div>
          <div>
            <div className="font-extrabold tracking-[-0.03em]">Preço Radar</div>
            <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-text-muted">Premium Data UI</div>
          </div>
        </button>

        <nav className="mt-9 grid gap-1.5">
          {navItems.map(({ id, label, icon: Icon, badge }) => {
            const active = activeView === id
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-white/[0.075] text-text-primary shadow-glow-accent'
                    : 'text-text-muted hover:bg-white/[0.035] hover:text-text-secondary'
                }`}
              >
                <span className={`transition-transform group-hover:translate-x-0.5 ${active ? 'text-accent-primary' : ''}`}>
                  <Icon size={17} />
                </span>
                <span className="flex-1">{label}</span>
                {badge != null ? (
                  <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[9px] text-text-secondary">{badge}</span>
                ) : null}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-success/15 bg-success/[0.055] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-success">
            <span className="status-dot" /> Monitoramento ativo
          </div>
          <p className="mt-2 text-[10px] leading-5 text-text-muted">
            Preços são consultados automaticamente. O painel atualiza sozinho a cada minuto.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[9px] text-text-muted">
            <Clock3 size={12} /> {dateTime(data.generated_at)}
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {mobileNav ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-bg-primary/96 p-5 backdrop-blur-2xl lg:hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 font-extrabold">
                <Radar className="text-accent-primary" /> Preço Radar
              </div>
              <button onClick={() => setMobileNav(false)} className="rounded-xl border border-border-soft p-2 text-text-secondary">
                <X size={19} />
              </button>
            </div>
            <nav className="mt-8 grid gap-2">
              {navItems.map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => navigate(id)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-semibold ${
                    activeView === id
                      ? 'border-accent-primary/25 bg-accent-primary/[0.07] text-text-primary'
                      : 'border-border-soft bg-white/[0.025] text-text-secondary'
                  }`}
                >
                  <Icon size={19} className={activeView === id ? 'text-accent-primary' : ''} />
                  <span className="flex-1">{label}</span>
                  {badge != null ? <span className="text-xs text-text-muted">{badge}</span> : null}
                </button>
              ))}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="min-h-screen lg:pl-[270px]">
        <header className="sticky top-0 z-30 border-b border-border-soft bg-bg-primary/70 px-4 py-3 backdrop-blur-2xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1480px] items-center gap-3">
            <button onClick={() => setMobileNav(true)} className="rounded-xl border border-border-soft bg-white/[0.025] p-2.5 text-text-secondary lg:hidden">
              <Menu size={19} />
            </button>
            <div className="hidden items-center gap-2 rounded-xl border border-border-soft bg-white/[0.025] px-3 py-2.5 text-[10px] text-text-muted sm:flex">
              <span className="status-dot" /> Radar online
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => load(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border-soft bg-white/[0.025] text-text-secondary transition hover:border-accent-primary/25 hover:text-accent-primary"
                aria-label="Atualizar dados"
              >
                <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-border-soft bg-white/[0.025] text-text-secondary">
                <Bell size={17} />
                {drops.length ? <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" /> : null}
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent-gradient px-3.5 text-xs font-extrabold text-bg-primary shadow-glow-accent transition hover:brightness-110"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Adicionar oferta</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {error ? (
            <div className="mb-5 rounded-2xl border border-danger/20 bg-danger/[0.07] px-4 py-3 text-xs text-danger">{error}</div>
          ) : null}

          {loading ? (
            <Skeleton />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeView === 'overview' ? (
                  <OverviewView
                    groups={groups}
                    history={data.history}
                    heroBestDrop={heroBestDrop}
                    drops={drops}
                    targets={targets}
                    reachedTargets={reachedTargets}
                    liveOffers={liveOffers}
                    coupons={validCoupons}
                    historyGroup={historyGroup}
                    historyDaily={historyDaily}
                    historyStats={historyStats}
                    historyStore={historyStore}
                    historyRange={historyRange}
                    setHistoryGroupKey={setHistoryGroupKey}
                    setHistoryStore={setHistoryStore}
                    setHistoryRange={setHistoryRange}
                    setSelectedGroupKey={setSelectedGroupKey}
                    navigate={navigate}
                  />
                ) : null}

                {activeView === 'changes' ? (
                  <ChangesView
                    changes={visibleChanges}
                    changeFilter={changeFilter}
                    setChangeFilter={setChangeFilter}
                    setSelectedGroupKey={setSelectedGroupKey}
                  />
                ) : null}

                {activeView === 'history' ? (
                  <HistoryView
                    groups={groups}
                    group={historyGroup}
                    data={historyDaily}
                    stats={historyStats}
                    store={historyStore}
                    range={historyRange}
                    setGroupKey={setHistoryGroupKey}
                    setStore={setHistoryStore}
                    setRange={setHistoryRange}
                  />
                ) : null}

                {activeView === 'coupons' ? <CouponsView coupons={validCoupons} setToast={setToast} /> : null}

                {activeView === 'models' ? (
                  <ModelsView
                    groups={visibleModels}
                    history={data.history}
                    search={search}
                    setSearch={setSearch}
                    gpuFilter={gpuFilter}
                    setGpuFilter={setGpuFilter}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    setSelectedGroupKey={setSelectedGroupKey}
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedGroup ? (
          <ProductDrawer
            group={selectedGroup}
            history={data.history}
            onClose={() => setSelectedGroupKey(null)}
            onTarget={() => setTargetGroupKey(selectedGroup.key)}
            onRefresh={async (offerId) => {
              try {
                const result = await manage({ action: 'check_now', id: offerId })
                setToast(result.price ? `Preço atualizado: ${money(result.price)}` : 'Oferta verificada')
                await load(true)
              } catch (drawerError) {
                setToast(drawerError.message)
              }
            }}
            onRemoveOffer={async (offerId) => {
              if (!window.confirm('Remover somente esta loja do modelo?')) return
              try {
                await manage({ action: 'delete', id: offerId })
                setToast('Oferta removida')
                await load(true)
                const stillExists = data.products.some((item) => item.id !== offerId && item.group_key === selectedGroup.key)
                if (!stillExists) setSelectedGroupKey(null)
              } catch (drawerError) {
                setToast(drawerError.message)
              }
            }}
            onToggle={async () => {
              const active = selectedGroup.offers.some((offer) => offer.active)
              try {
                await manage({ action: 'toggle_group', group_key: selectedGroup.key, active: !active })
                setToast(active ? 'Grupo pausado' : 'Grupo retomado')
                await load(true)
              } catch (drawerError) {
                setToast(drawerError.message)
              }
            }}
            onDelete={async () => {
              if (!window.confirm('Excluir este modelo, todas as lojas e todo o histórico?')) return
              try {
                await manage({ action: 'delete_group', group_key: selectedGroup.key })
                setSelectedGroupKey(null)
                setToast('Modelo excluído')
                await load(true)
              } catch (drawerError) {
                setToast(drawerError.message)
              }
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd ? (
          <AddProductModal
            onClose={() => setShowAdd(false)}
            onSubmit={async ({ url, model, target }) => {
              try {
                await manage({ action: 'add', url, model: model || null, target_price: parseMoney(target) })
                setShowAdd(false)
                setToast('Oferta adicionada ao radar')
                await load(true)
              } catch (modalError) {
                setToast(modalError.message)
              }
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {targetGroupKey ? (
          <TargetModal
            group={groups.find((group) => group.key === targetGroupKey)}
            onClose={() => setTargetGroupKey(null)}
            onSubmit={async (value) => {
              try {
                await manage({
                  action: 'update_group_target',
                  group_key: targetGroupKey,
                  target_price: parseMoney(value),
                })
                setTargetGroupKey(null)
                setToast('Preço-alvo atualizado')
                await load(true)
              } catch (modalError) {
                setToast(modalError.message)
              }
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 18, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            className="fixed bottom-5 left-1/2 z-[100] rounded-xl border border-border-soft bg-bg-primary/95 px-4 py-3 text-xs font-semibold text-text-secondary shadow-card backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function OverviewView({
  groups,
  history,
  heroBestDrop,
  drops,
  targets,
  reachedTargets,
  liveOffers,
  coupons,
  historyGroup,
  historyDaily,
  historyStats,
  historyStore,
  historyRange,
  setHistoryGroupKey,
  setHistoryStore,
  setHistoryRange,
  setSelectedGroupKey,
  navigate,
}) {
  return (
    <div className="grid gap-6">
      <motion.section
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="radar-grid relative min-h-[330px] overflow-hidden rounded-[28px] border border-border-soft bg-hero-gradient shadow-card sm:min-h-[380px]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/88 to-bg-primary/10" />
        <div className="hero-image-mask absolute inset-y-0 right-0 w-[68%] opacity-50 sm:opacity-70">
          <Image src={HERO_IMAGE} alt="Notebook em uma mesa de trabalho" fill priority sizes="(max-width: 768px) 100vw, 65vw" className="object-cover" />
        </div>
        <div className="absolute right-[8%] top-[10%] h-40 w-40 rounded-full bg-accent-primary/15 blur-[70px]" />
        <div className="absolute bottom-[5%] right-[28%] h-40 w-40 rounded-full bg-accent-secondary/20 blur-[80px]" />

        <div className="relative z-10 flex min-h-[330px] max-w-3xl flex-col justify-center px-6 py-10 sm:min-h-[380px] sm:px-10">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent-primary/20 bg-accent-primary/[0.07] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-accent-primary">
            <Sparkles size={12} /> Radar inteligente de oportunidades
          </div>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.02] tracking-[-0.055em] text-text-primary sm:text-5xl lg:text-[56px]">
            Compre quando o preço <span className="text-gradient">realmente fizer sentido.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-text-secondary/80">
            Compare configurações, acompanhe o histórico por dia e descubra a melhor loja sem depender de preço riscado ou cupom duvidoso.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => navigate('changes')} className="inline-flex items-center gap-2 rounded-xl bg-accent-gradient px-4 py-3 text-xs font-extrabold text-bg-primary shadow-glow-accent">
              <TrendingDown size={16} /> Ver maiores quedas
            </button>
            <button onClick={() => navigate('models')} className="inline-flex items-center gap-2 rounded-xl border border-border-medium bg-white/[0.05] px-4 py-3 text-xs font-bold text-text-secondary backdrop-blur-xl hover:bg-white/[0.08]">
              Comparar modelos <ChevronRight size={15} />
            </button>
          </div>
          {heroBestDrop ? (
            <div className="mt-7 flex w-fit items-center gap-3 rounded-2xl border border-success/15 bg-success/[0.06] px-4 py-3 backdrop-blur-xl">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-success/10 text-success"><ArrowDownRight size={18} /></div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-success/80">Maior queda detectada</p>
                <p className="mt-0.5 text-xs font-bold text-text-primary">{heroBestDrop.group.name} · {Math.abs(heroBestDrop.pct).toFixed(1).replace('.', ',')}%</p>
              </div>
            </div>
          ) : null}
        </div>
      </motion.section>

      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={TrendingDown} label="Maior queda" value={heroBestDrop ? `-${Math.abs(heroBestDrop.pct).toFixed(1).replace('.', ',')}%` : '—'} detail={heroBestDrop?.group.name || 'Aguardando mudança real'} accent="green" />
        <MetricCard icon={Target} label="Na sua meta" value={`${reachedTargets.length} de ${targets.length}`} detail="modelos prontos para comprar" accent="purple" />
        <MetricCard icon={TicketPercent} label="Cupons validados" value={String(coupons.length)} detail="somente carrinho confirmado" accent="amber" />
        <MetricCard icon={Radar} label="Radar ao vivo" value={String(liveOffers.length)} detail={`${groups.length} modelos monitorados`} accent="cyan" />
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <section className="premium-card p-5 sm:p-6">
          <SectionTitle eyebrow="Oportunidades" title="Maiores quedas agora" description="Mudanças reais entre duas leituras distintas, ordenadas pela maior queda." action={<button onClick={() => navigate('changes')} className="text-xs font-bold text-accent-primary">Ver todas</button>} />
          <div className="grid gap-2">
            {drops.slice(0, 5).map((change, index) => (
              <motion.button
                key={`${change.offer.id}-${change.checkedAt}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedGroupKey(change.group.key)}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-transparent px-2 py-3 text-left transition hover:border-border-soft hover:bg-white/[0.035] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-success/10 text-[10px] font-extrabold text-success">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-text-primary">{change.group.name}</span>
                  <span className="mt-1 block truncate text-[9px] text-text-muted">{change.offer.store || 'Loja'} · {dateTime(change.checkedAt)}</span>
                </span>
                <span className="hidden text-right sm:block">
                  <span className="block text-[9px] text-text-muted line-through">{money(change.before)}</span>
                  <span className="block text-xs font-extrabold text-text-primary">{money(change.after)}</span>
                </span>
                <span className="rounded-full bg-success/10 px-2.5 py-1.5 text-[9px] font-extrabold text-success">▼ {Math.abs(change.pct).toFixed(2).replace('.', ',')}%</span>
              </motion.button>
            ))}
            {!drops.length ? <div className="rounded-2xl border border-dashed border-border-soft p-8 text-center text-xs text-text-muted">Ainda não houve uma queda real.</div> : null}
          </div>
        </section>

        <section className="premium-card relative min-h-[390px] overflow-hidden p-5 sm:p-6">
          <div className="absolute inset-0 opacity-[0.11]"><Image src={SHOP_IMAGE} alt="Compra online" fill sizes="600px" className="object-cover" /></div>
          <div className="absolute inset-0 bg-gradient-to-b from-surface-1/90 via-surface-1/95 to-surface-1" />
          <div className="relative">
            <SectionTitle eyebrow="Suas metas" title="Quanto falta para comprar?" description="O menor preço ao vivo entre as lojas é comparado com a sua meta." />
            <div className="grid gap-3">
              {targets.slice(0, 5).map((group) => {
                const stats = groupStats(history, group)
                const gap = stats.current != null && stats.target != null ? Math.max(0, stats.current - stats.target) : null
                const progress = stats.current && stats.target ? Math.min(100, (stats.target / stats.current) * 100) : 0
                return (
                  <button key={group.key} onClick={() => setSelectedGroupKey(group.key)} className="rounded-2xl border border-border-soft bg-bg-primary/45 p-3.5 text-left backdrop-blur-xl transition hover:border-accent-primary/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-[11px] font-bold text-text-primary">{group.name}</p><p className="mt-1 text-[9px] text-text-muted">{stats.offer?.store || 'Sem preço ao vivo'}</p></div>
                      <div className="text-right"><p className="text-xs font-extrabold">{money(stats.current)}</p><p className="text-[8px] text-text-muted">meta {money(stats.target)}</p></div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className={`h-full rounded-full ${stats.reached ? 'bg-success' : 'bg-accent-primary'}`} style={{ width: `${progress}%` }} /></div>
                    <div className="mt-2 flex justify-between text-[8px]"><span className={stats.reached ? 'font-bold text-success' : 'text-text-muted'}>{stats.reached ? '✓ Meta atingida' : gap != null ? `Faltam ${money(gap)}` : 'Sem leitura'}</span><span className="text-text-muted">{Math.round(progress)}%</span></div>
                  </button>
                )
              })}
              {!targets.length ? <div className="rounded-2xl border border-dashed border-border-soft p-8 text-center text-xs text-text-muted">Nenhum modelo tem meta definida.</div> : null}
            </div>
          </div>
        </section>
      </div>

      <HistoryCard groups={groups} group={historyGroup} data={historyDaily} stats={historyStats} store={historyStore} range={historyRange} setGroupKey={setHistoryGroupKey} setStore={setHistoryStore} setRange={setHistoryRange} onFullHistory={() => navigate('history')} />

      <section>
        <SectionTitle eyebrow="Comparador" title="Modelos em destaque" description="Veja CPU, RAM, SSD e GPU antes de decidir qual versão vale mais." action={<button onClick={() => navigate('models')} className="text-xs font-bold text-accent-primary">Ver catálogo completo</button>} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.slice().sort((a, b) => a.rank - b.rank).slice(0, 6).map((group) => <ModelCard key={group.key} group={group} history={history} onOpen={() => setSelectedGroupKey(group.key)} />)}
        </div>
      </section>
    </div>
  )
}

function HistoryCard({ groups, group, data, stats, store, range, setGroupKey, setStore, setRange, onFullHistory }) {
  const target = group ? targetForGroup(group) : null
  return (
    <section className="premium-card overflow-hidden">
      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <SectionTitle eyebrow="Coração do radar" title="Histórico de preço" description="Passe o mouse ou toque na curva para ver o preço exato em cada data." action={onFullHistory ? <button onClick={onFullHistory} className="text-xs font-bold text-accent-primary">Abrir histórico completo</button> : null} />
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <select value={group?.key || ''} onChange={(event) => setGroupKey(event.target.value)} className="rounded-xl border border-border-soft bg-bg-primary/65 px-3 py-2.5 text-[10px] font-semibold text-text-secondary outline-none focus:border-accent-primary/35">
              {groups.map((entry) => <option key={entry.key} value={entry.key}>{entry.name}</option>)}
            </select>
            <select value={store} onChange={(event) => setStore(event.target.value)} className="rounded-xl border border-border-soft bg-bg-primary/65 px-3 py-2.5 text-[10px] font-semibold text-text-secondary outline-none focus:border-accent-primary/35">
              <option value="best">Menor preço entre lojas</option>
              {(group?.offers || []).map((offer) => <option key={offer.id} value={offer.id}>{offer.store || 'Loja'}</option>)}
            </select>
            <select value={range} onChange={(event) => setRange(event.target.value)} className="rounded-xl border border-border-soft bg-bg-primary/65 px-3 py-2.5 text-[10px] font-semibold text-text-secondary outline-none focus:border-accent-primary/35">
              <option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="365">1 ano</option>
            </select>
          </div>
          <PriceHistoryChart data={data} targetPrice={target} />
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border-soft bg-bg-primary/60 p-4">
          <div className="absolute inset-0 opacity-[0.12]"><Image src={DATA_IMAGE} alt="Análise de dados" fill sizes="330px" className="object-cover" /></div>
          <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/50 to-bg-primary" />
          <div className="relative">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-accent-primary">Resumo do período</p>
            <h3 className="mt-2 line-clamp-2 text-lg font-bold tracking-[-0.03em]">{group?.name || 'Selecione um modelo'}</h3>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {[['Menor preço', stats?.min], ['Maior preço', stats?.max], ['Primeiro preço', stats?.first], ['Variação', stats?.delta]].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border-soft bg-white/[0.04] p-3 backdrop-blur-xl"><p className="text-[8px] uppercase tracking-[0.08em] text-text-muted">{label}</p><p className={`mt-1 text-sm font-extrabold ${label === 'Variação' && value < 0 ? 'text-success' : label === 'Variação' && value > 0 ? 'text-danger' : 'text-text-primary'}`}>{label === 'Variação' && value > 0 ? '+' : ''}{money(value)}</p></div>
              ))}
            </div>
            {group ? <div className="mt-4"><HardwareSpecs group={group} compact /></div> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function ChangesView({ changes, changeFilter, setChangeFilter, setSelectedGroupKey }) {
  return (
    <div>
      <SectionTitle eyebrow="Movimentos reais" title="Mudanças de preço" description="Quedas aparecem primeiro. Repetições do mesmo valor são ignoradas." action={<div className="flex rounded-xl border border-border-soft bg-white/[0.025] p-1">{[['all','Todas'],['drops','Só quedas'],['rises','Só altas']].map(([id,label]) => <button key={id} onClick={() => setChangeFilter(id)} className={`rounded-lg px-3 py-2 text-[9px] font-bold transition ${changeFilter === id ? 'bg-white/[0.09] text-text-primary' : 'text-text-muted'}`}>{label}</button>)}</div>} />
      <div className="grid gap-3">
        {changes.map((change, index) => {
          const down = change.pct < 0
          return (
            <motion.button key={`${change.offer.id}-${change.checkedAt}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.35) }} onClick={() => setSelectedGroupKey(change.group.key)} className={`premium-card grid gap-4 p-4 text-left sm:grid-cols-[minmax(0,1.5fr)_auto_auto_auto] sm:items-center ${down ? 'border-l-2 !border-l-success/70' : 'border-l-2 !border-l-danger/70'}`}>
              <div className="min-w-0"><p className="truncate text-xs font-bold">{change.group.name}</p><p className="mt-1 text-[9px] text-text-muted">{change.offer.store || 'Loja'} · {dateTime(change.checkedAt)}</p></div>
              <div><span className="text-[10px] text-text-muted line-through">{money(change.before)}</span><span className="ml-2 text-sm font-extrabold">{money(change.after)}</span></div>
              <div className={`w-fit rounded-full px-2.5 py-1.5 text-[9px] font-extrabold ${down ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{down ? '▼' : '▲'} {Math.abs(change.pct).toFixed(2).replace('.', ',')}%</div>
              <ChevronRight size={16} className="hidden text-text-muted sm:block" />
            </motion.button>
          )
        })}
        {!changes.length ? <div className="rounded-3xl border border-dashed border-border-soft p-16 text-center text-xs text-text-muted">Nenhuma mudança neste filtro.</div> : null}
      </div>
    </div>
  )
}

function HistoryView({ groups, group, data, stats, store, range, setGroupKey, setStore, setRange }) {
  return (
    <div className="grid gap-5">
      <HistoryCard groups={groups} group={group} data={data} stats={stats} store={store} range={range} setGroupKey={setGroupKey} setStore={setStore} setRange={setRange} />
      <section className="premium-card overflow-hidden p-5 sm:p-6">
        <SectionTitle eyebrow="Leituras por dia" title="Quanto custava naquele dia?" description="O menor preço observado em cada dia fica registrado com a loja responsável." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-[10px]">
            <thead><tr className="border-b border-border-soft text-text-muted"><th className="py-3 font-semibold">Data</th><th className="py-3 font-semibold">Preço observado</th><th className="py-3 font-semibold">Loja</th><th className="py-3 font-semibold">Leituras</th></tr></thead>
            <tbody>{data.slice().reverse().map((item) => <tr key={item.key} className="border-b border-border-soft/70 last:border-0"><td className="py-3 text-text-secondary">{dateOnly(item.iso)}</td><td className="py-3 text-xs font-extrabold">{money(item.price)}</td><td className="py-3 text-text-secondary">{item.store}</td><td className="py-3 text-text-muted">{item.readings}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function CouponsView({ coupons, setToast }) {
  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden rounded-[28px] border border-border-soft bg-hero-gradient p-6 sm:p-8">
        <div className="absolute inset-y-0 right-0 w-[52%] opacity-30"><Image src={SHOP_IMAGE} alt="Compras online" fill sizes="55vw" className="object-cover" /></div>
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/90 to-transparent" />
        <div className="relative max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-success/15 bg-success/[0.06] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-success"><Check size={12}/> Validação rígida</div><h1 className="text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">Cupom só aparece quando o carrinho comprova.</h1><p className="mt-3 max-w-xl text-xs leading-6 text-text-secondary/80">Página oficial e agregador servem apenas para descoberta. Sem desconto confirmado no SKU exato, o código fica escondido.</p></div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        {coupons.map((coupon) => <article key={coupon.id} className="premium-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-success">✓ Carrinho confirmado</p><h3 className="mt-2 text-base font-bold">{coupon.title || 'Cupom confirmado'}</h3><p className="mt-1 text-[10px] text-text-muted">{coupon.store} · {coupon.model || 'SKU monitorado'}</p></div><TicketPercent className="text-accent-primary" /></div><div className="mt-5 flex items-center gap-2"><code className="flex-1 rounded-xl border border-dashed border-accent-primary/25 bg-accent-primary/[0.05] px-4 py-3 text-center text-lg font-black tracking-[0.12em] text-accent-primary">{coupon.code}</code><button onClick={async () => { try { await navigator.clipboard.writeText(coupon.code); setToast('Cupom copiado') } catch { setToast(`Cupom: ${coupon.code}`) } }} className="grid h-12 w-12 place-items-center rounded-xl border border-border-soft bg-white/[0.035] text-text-secondary"><Copy size={17}/></button></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[9px] text-text-muted"><span>{coupon.validated_discount_text || coupon.discount_text || 'Desconto aplicado com sucesso'}</span><span>validado {dateTime(coupon.cart_verified_at)}</span></div>{coupon.offer_url || coupon.source_url ? <a href={coupon.offer_url || coupon.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold text-accent-primary">Abrir produto <ExternalLink size={12}/></a> : null}</article>)}
        {!coupons.length ? <div className="lg:col-span-2 rounded-3xl border border-dashed border-border-soft bg-white/[0.02] p-14 text-center"><TicketPercent className="mx-auto text-text-muted" size={34}/><h3 className="mt-4 text-sm font-bold">Nenhum cupom confirmado agora</h3><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-text-muted">Isso é intencional: o radar prefere mostrar zero a te dar um código que talvez falhe no carrinho.</p></div> : null}
      </div>
    </div>
  )
}

function ModelsView({ groups, history, search, setSearch, gpuFilter, setGpuFilter, sortBy, setSortBy, setSelectedGroupKey }) {
  return (
    <div>
      <SectionTitle eyebrow="Catálogo monitorado" title="Compare as versões lado a lado" description="Processador, RAM, SSD, GPU e melhor preço ficam visíveis antes de você abrir os detalhes." />
      <div className="mb-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
        <label className="flex items-center gap-2 rounded-xl border border-border-soft bg-white/[0.025] px-3"><Search size={15} className="text-text-muted"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar modelo, CPU ou memória" className="h-11 w-full bg-transparent text-xs text-text-secondary outline-none placeholder:text-text-muted"/></label>
        <select value={gpuFilter} onChange={(event) => setGpuFilter(event.target.value)} className="rounded-xl border border-border-soft bg-bg-primary/80 px-3 text-[10px] font-semibold text-text-secondary"><option value="all">Todas as GPUs</option><option value="RTX 4050">RTX 4050</option><option value="RTX 4060">RTX 4060</option><option value="apple">Apple Silicon</option></select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-xl border border-border-soft bg-bg-primary/80 px-3 text-[10px] font-semibold text-text-secondary"><option value="rank">Recomendados</option><option value="price">Menor preço</option><option value="drop">Maior queda</option><option value="name">Nome A–Z</option></select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group, index) => <motion.div key={group.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .03, .35) }}><ModelCard group={group} history={history} onOpen={() => setSelectedGroupKey(group.key)} /></motion.div>)}
      </div>
      {!groups.length ? <div className="rounded-3xl border border-dashed border-border-soft p-16 text-center text-xs text-text-muted">Nenhum modelo encontrado com esses filtros.</div> : null}
    </div>
  )
}

function ModelCard({ group, history, onOpen }) {
  const stats = groupStats(history, group)
  return (
    <button onClick={onOpen} className="premium-card group flex h-full w-full flex-col text-left">
      <div className="relative h-36 overflow-hidden border-b border-border-soft">
        <Image src={modelImage(group)} alt="Tecnologia" fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover opacity-50 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/25 to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2"><span className="rounded-full border border-white/10 bg-bg-primary/65 px-2.5 py-1 text-[8px] font-extrabold text-text-secondary backdrop-blur">{group.model || 'MODELO'}</span>{stats.drop ? <span className="rounded-full bg-success/15 px-2.5 py-1 text-[8px] font-extrabold text-success backdrop-blur">▼ {Math.abs(stats.drop.pct).toFixed(1).replace('.', ',')}%</span> : null}</div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="line-clamp-2 text-sm font-bold leading-5">{group.name}</h3><p className="mt-1 text-[9px] text-text-muted">{group.offers.length} loja{group.offers.length === 1 ? '' : 's'} · {stats.live ? 'preço ao vivo' : 'último conhecido'}</p></div><ChevronRight size={17} className="mt-1 shrink-0 text-text-muted transition group-hover:translate-x-1 group-hover:text-accent-primary" /></div>
        <div className="mt-4"><HardwareSpecs group={group} compact /></div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5"><div><p className="text-[8px] uppercase tracking-[0.1em] text-text-muted">Melhor preço</p><p className="mt-1 text-xl font-extrabold tracking-[-0.04em]">{money(stats.current)}</p></div><div className="text-right">{stats.reached ? <span className="rounded-full bg-success/10 px-2.5 py-1.5 text-[8px] font-extrabold text-success">✓ Na meta</span> : stats.target != null ? <p className="text-[9px] text-text-muted">meta<br/><strong className="text-text-secondary">{money(stats.target)}</strong></p> : <span className="text-[9px] text-text-muted">sem meta</span>}</div></div>
      </div>
    </button>
  )
}

function ProductDrawer({ group, history, onClose, onTarget, onRefresh, onRemoveOffer, onToggle, onDelete }) {
  const stats = groupStats(history, group)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }} className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-border-soft bg-bg-primary shadow-drawer">
        <div className="relative min-h-[240px] overflow-hidden border-b border-border-soft p-6">
          <Image src={modelImage(group)} alt="Notebook" fill sizes="760px" className="object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/85 to-bg-primary/35" />
          <div className="relative flex h-full flex-col justify-between gap-10"><div className="flex justify-between gap-4"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-accent-primary">Detalhes do modelo</p><h2 className="mt-2 max-w-xl text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">{group.name}</h2><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full border border-border-soft bg-white/[0.05] px-2.5 py-1 text-[9px] text-text-secondary">{group.model}</span><span className="rounded-full border border-accent-primary/15 bg-accent-primary/[0.06] px-2.5 py-1 text-[9px] text-accent-primary">{group.gpu}</span></div></div><button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border-soft bg-bg-primary/55 text-text-secondary backdrop-blur"><X size={18}/></button></div><HardwareSpecs group={group} /></div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6">
          <div className="grid grid-cols-3 gap-2"><div className="rounded-2xl border border-border-soft bg-white/[0.03] p-3"><p className="text-[8px] uppercase text-text-muted">Melhor preço</p><p className="mt-1 text-sm font-extrabold">{money(stats.current)}</p></div><div className="rounded-2xl border border-border-soft bg-white/[0.03] p-3"><p className="text-[8px] uppercase text-text-muted">Sua meta</p><p className="mt-1 text-sm font-extrabold">{money(stats.target)}</p></div><div className="rounded-2xl border border-border-soft bg-white/[0.03] p-3"><p className="text-[8px] uppercase text-text-muted">Status</p><p className={`mt-1 text-sm font-extrabold ${stats.reached ? 'text-success' : ''}`}>{stats.reached ? 'Na meta' : stats.live ? 'Monitorando' : 'Conhecido'}</p></div></div>

          <section><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Lojas monitoradas</h3><span className="text-[9px] text-text-muted">{group.offers.length} oferta{group.offers.length === 1 ? '' : 's'}</span></div><div className="grid gap-2">{group.offers.slice().sort((a,b)=>(a.last_error?1:0)-(b.last_error?1:0)||(Number(a.current_price)||1e12)-(Number(b.current_price)||1e12)).map((offer) => <div key={offer.id} className="rounded-2xl border border-border-soft bg-white/[0.025] p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Store size={14} className="text-accent-primary"/><p className="truncate text-[11px] font-bold">{offer.store || 'Loja'}</p></div><p className="mt-1 text-[8px] text-text-muted">{offer.last_error ? 'último preço conhecido' : 'preço ao vivo'} · {dateTime(offer.last_checked_at)}</p></div><p className="text-base font-extrabold">{money(offer.current_price)}</p><div className="flex gap-1.5"><a href={offer.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border-soft px-2.5 py-2 text-[8px] font-bold text-text-secondary">Abrir <ExternalLink size={10}/></a><button onClick={() => onRefresh(offer.id)} className="rounded-lg border border-border-soft px-2.5 py-2 text-[8px] font-bold text-text-secondary">Verificar</button><button onClick={() => onRemoveOffer(offer.id)} className="rounded-lg border border-danger/15 px-2.5 py-2 text-danger"><Trash2 size={12}/></button></div></div>{offer.last_error ? <p className="mt-2 line-clamp-2 text-[8px] text-warning">{offer.last_error}</p> : null}</div>)}</div></section>

          <section><h3 className="mb-3 text-sm font-bold">Últimas mudanças</h3><div className="grid gap-2">{stats.changes.slice(0,6).map((change) => <div key={`${change.offer.id}-${change.checkedAt}`} className="flex items-center gap-3 rounded-xl border border-border-soft bg-white/[0.025] p-3"><div className={`grid h-8 w-8 place-items-center rounded-xl ${change.pct < 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{change.pct < 0 ? <ArrowDownRight size={16}/> : <ArrowUpRight size={16}/>}</div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold">{change.offer.store || 'Loja'}</p><p className="text-[8px] text-text-muted">{money(change.before)} → {money(change.after)} · {dateTime(change.checkedAt)}</p></div><span className={`text-[9px] font-extrabold ${change.pct < 0 ? 'text-success' : 'text-danger'}`}>{change.pct < 0 ? '▼' : '▲'} {Math.abs(change.pct).toFixed(2).replace('.', ',')}%</span></div>)}{!stats.changes.length ? <div className="rounded-xl border border-dashed border-border-soft p-5 text-center text-[10px] text-text-muted">Nenhuma mudança real registrada.</div> : null}</div></section>
        </div>

        <div className="sticky bottom-0 mt-auto flex flex-wrap justify-end gap-2 border-t border-border-soft bg-bg-primary/95 p-4 backdrop-blur-xl"><button onClick={onTarget} className="rounded-xl border border-border-soft px-3 py-2.5 text-[10px] font-bold text-text-secondary"><Target size={13} className="mr-1.5 inline"/> {stats.target != null ? 'Alterar meta' : 'Definir meta'}</button><button onClick={onToggle} className="rounded-xl border border-border-soft px-3 py-2.5 text-[10px] font-bold text-text-secondary">{group.offers.some((offer)=>offer.active) ? <><Pause size={13} className="mr-1.5 inline"/>Pausar grupo</> : <><Play size={13} className="mr-1.5 inline"/>Retomar grupo</>}</button><button onClick={onDelete} className="rounded-xl border border-danger/20 px-3 py-2.5 text-[10px] font-bold text-danger"><Trash2 size={13} className="mr-1.5 inline"/>Excluir grupo</button></div>
      </motion.aside>
    </motion.div>
  )
}

function AddProductModal({ onClose, onSubmit }) {
  const [saving, setSaving] = useState(false)
  return <ModalShell title="Adicionar oferta" eyebrow="Novo monitoramento" onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); await onSubmit({ url: String(form.get('url')||''), model: String(form.get('model')||''), target: String(form.get('target')||'') }); setSaving(false) }} className="grid gap-4"><Field label="Link da loja"><input name="url" type="url" required placeholder="https://loja.com/produto..." className="w-full rounded-xl border border-border-soft bg-bg-primary/70 px-3 py-3 text-xs text-text-secondary outline-none focus:border-accent-primary/35"/></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="SKU / modelo" hint="opcional"><input name="model" placeholder="ANV15-41-R6J0" className="w-full rounded-xl border border-border-soft bg-bg-primary/70 px-3 py-3 text-xs text-text-secondary outline-none focus:border-accent-primary/35"/></Field><Field label="Preço-alvo" hint="opcional"><input name="target" inputMode="decimal" placeholder="4.999,00" className="w-full rounded-xl border border-border-soft bg-bg-primary/70 px-3 py-3 text-xs text-text-secondary outline-none focus:border-accent-primary/35"/></Field></div><p className="text-[10px] leading-5 text-text-muted">Para adicionar outra loja do mesmo notebook, use o mesmo SKU. O radar agrupa as ofertas automaticamente.</p><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-border-soft px-4 py-2.5 text-[10px] font-bold text-text-secondary">Cancelar</button><button disabled={saving} className="rounded-xl bg-accent-gradient px-4 py-2.5 text-[10px] font-extrabold text-bg-primary">{saving ? 'Adicionando…' : 'Adicionar ao radar'}</button></div></form></ModalShell>
}

function TargetModal({ group, onClose, onSubmit }) {
  const current = group ? targetForGroup(group) : null
  return <ModalShell title="Alterar preço-alvo" eyebrow={group?.name || 'Meta'} onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get('target'); await onSubmit(String(value||'')) }} className="grid gap-4"><Field label="Novo preço-alvo"><input name="target" defaultValue={current != null ? current.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : ''} inputMode="decimal" placeholder="4.999,00" className="w-full rounded-xl border border-border-soft bg-bg-primary/70 px-3 py-3 text-xs text-text-secondary outline-none focus:border-accent-primary/35"/></Field><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-border-soft px-4 py-2.5 text-[10px] font-bold text-text-secondary">Cancelar</button><button className="rounded-xl bg-accent-gradient px-4 py-2.5 text-[10px] font-extrabold text-bg-primary">Salvar meta</button></div></form></ModalShell>
}

function Field({ label, hint, children }) { return <label className="grid gap-1.5"><span className="text-[10px] font-bold text-text-secondary">{label} {hint ? <em className="font-normal not-italic text-text-muted">({hint})</em> : null}</span>{children}</label> }

function ModalShell({ title, eyebrow, onClose, children }) {
  return <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose()}}><motion.div initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:.98}} transition={{duration:.25,ease:[.22,1,.36,1]}} className="w-full max-w-xl rounded-3xl border border-border-soft bg-surface-1 p-5 shadow-card sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-[8px] font-extrabold uppercase tracking-[.14em] text-accent-primary">{eyebrow}</p><h2 className="mt-1 text-xl font-extrabold tracking-[-.03em]">{title}</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-border-soft text-text-secondary"><X size={17}/></button></div>{children}</motion.div></motion.div>
}
