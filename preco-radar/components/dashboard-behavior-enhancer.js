'use client'

import { Bell, ExternalLink, Target, TrendingDown, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const DATA_URL = 'https://sziaumkwyxodhtuaxlhg.supabase.co/functions/v1/dashboard-data'

const money = (value) =>
  value == null || Number.isNaN(Number(value))
    ? '—'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2,
      }).format(Number(value))

function groupKey(product) {
  return product.group_key || product.model || product.id
}

function buildGroups(products) {
  const map = new Map()
  for (const product of products || []) {
    const key = groupKey(product)
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: product.group_name || product.name,
        offers: [],
      })
    }
    map.get(key).offers.push(product)
  }
  return [...map.values()]
}

function distinctPricesForOffer(history, offerId) {
  const values = new Set()
  for (const item of history || []) {
    if (item.product_id !== offerId) continue
    const price = Number(item.price)
    if (Number.isFinite(price) && price > 0) values.add(price.toFixed(2))
  }
  return values
}

function changedGroupKeys(products, history) {
  const changedOffers = new Set()
  for (const product of products || []) {
    if (distinctPricesForOffer(history, product.id).size >= 2) changedOffers.add(product.id)
  }

  const keys = new Set()
  for (const product of products || []) {
    if (changedOffers.has(product.id)) keys.add(groupKey(product))
  }
  return keys
}

function latestOfferChange(history, offer) {
  const rows = (history || [])
    .filter((item) => item.product_id === offer.id)
    .map((item) => ({ price: Number(item.price), checkedAt: item.checked_at }))
    .filter((item) => Number.isFinite(item.price))
    .sort((a, b) => new Date(a.checkedAt) - new Date(b.checkedAt))

  const distinct = []
  for (const row of rows) {
    if (!distinct.length || Math.abs(distinct.at(-1).price - row.price) > 0.009) distinct.push(row)
  }
  if (distinct.length < 2) return null

  const before = distinct.at(-2)
  const after = distinct.at(-1)
  return {
    before: before.price,
    after: after.price,
    pct: ((after.price - before.price) / before.price) * 100,
    checkedAt: after.checkedAt,
    store: offer.store || 'Loja',
  }
}

function buildNotifications(products, history) {
  const groups = buildGroups(products)
  const items = []

  for (const group of groups) {
    const active = group.offers.filter((offer) => offer.active && offer.current_price != null)
    const live = active.filter((offer) => !offer.last_error)
    const pool = live.length ? live : active
    const best = [...pool].sort((a, b) => Number(a.current_price) - Number(b.current_price))[0]
    const targetOffer = group.offers.find((offer) => offer.target_price != null)
    const target = targetOffer ? Number(targetOffer.target_price) : null

    if (best && target && Number(best.current_price) <= target) {
      items.push({
        id: `target-${group.key}`,
        kind: 'target',
        title: `${group.name} bateu a meta`,
        detail: `${money(best.current_price)} · meta ${money(target)} · ${best.store || 'Loja'}`,
        url: best.url,
        time: best.last_checked_at,
      })
    }

    for (const offer of group.offers) {
      const change = latestOfferChange(history, offer)
      if (!change) continue
      items.push({
        id: `change-${offer.id}-${change.checkedAt}`,
        kind: 'change',
        title: `${group.name} ${change.pct < 0 ? 'caiu' : 'subiu'} ${Math.abs(change.pct).toFixed(1).replace('.', ',')}%`,
        detail: `${money(change.before)} → ${money(change.after)} · ${change.store}`,
        url: offer.url,
        time: change.checkedAt,
      })
    }
  }

  return items
    .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
    .slice(0, 12)
}

function findBellButton() {
  const icon = document.querySelector('header svg.lucide-bell')
  return icon?.closest('button') || null
}

function filterHistorySelects(products, history) {
  const allKeys = new Set((products || []).map(groupKey))
  const changed = changedGroupKeys(products, history)
  if (!allKeys.size) return

  for (const select of document.querySelectorAll('select')) {
    const matchingOptions = [...select.options].filter((option) => allKeys.has(option.value))
    if (matchingOptions.length < 2) continue

    let firstAllowed = null
    for (const option of matchingOptions) {
      const allowed = changed.has(option.value)
      option.hidden = !allowed
      option.disabled = !allowed
      option.style.display = allowed ? '' : 'none'
      if (allowed && !firstAllowed) firstAllowed = option.value
    }

    if (firstAllowed && !changed.has(select.value)) {
      select.value = firstAllowed
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }

    select.dataset.realPriceChangesOnly = 'true'
    select.title = 'Somente modelos cuja mesma oferta já teve pelo menos dois preços diferentes'
  }
}

export default function DashboardBehaviorEnhancer() {
  const [payload, setPayload] = useState({ products: [], history: [] })
  const [open, setOpen] = useState(false)

  const notifications = useMemo(
    () => buildNotifications(payload.products, payload.history),
    [payload.products, payload.history],
  )

  useEffect(() => {
    let cancelled = false

    const load = () =>
      fetch(`${DATA_URL}?enhancer=${Date.now()}`, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return response.json()
        })
        .then((data) => {
          if (cancelled) return
          const next = { products: data.products || [], history: data.history || [] }
          setPayload(next)
          window.requestAnimationFrame(() => filterHistorySelects(next.products, next.history))
        })
        .catch(() => {})

    load()
    const timer = window.setInterval(load, 60000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let bell = null
    const attach = () => {
      const next = findBellButton()
      if (!next || next === bell) return
      if (bell) bell.removeEventListener('click', toggle)
      bell = next
      bell.setAttribute('aria-label', 'Abrir notificações')
      bell.setAttribute('title', 'Notificações')
      bell.addEventListener('click', toggle)
    }

    const toggle = (event) => {
      event.preventDefault()
      event.stopPropagation()
      setOpen((value) => !value)
    }

    attach()
    const observer = new MutationObserver(() => {
      attach()
      if (payload.products.length) filterHistorySelects(payload.products, payload.history)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      if (bell) bell.removeEventListener('click', toggle)
    }
  }, [payload])

  if (!open) return null

  return (
    <div className="fixed right-3 top-[66px] z-[120] w-[calc(100vw-24px)] max-w-[390px] overflow-hidden rounded-2xl border border-border-soft bg-bg-primary/98 shadow-card backdrop-blur-2xl sm:right-6">
      <div className="flex items-center justify-between border-b border-border-soft px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <Bell size={17} />
          </div>
          <div>
            <p className="text-xs font-extrabold text-text-primary">Notificações</p>
            <p className="text-[9px] text-text-muted">Metas e mudanças reais de preço</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-border-soft text-text-muted hover:text-text-primary" aria-label="Fechar notificações">
          <X size={15} />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-2">
        {notifications.map((item) => (
          <a
            key={item.id}
            href={item.url || '#'}
            target={item.url ? '_blank' : undefined}
            rel={item.url ? 'noreferrer' : undefined}
            className="flex gap-3 rounded-xl border border-transparent p-3 transition hover:border-border-soft hover:bg-white/[0.035]"
          >
            <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.kind === 'target' ? 'bg-success/10 text-success' : 'bg-accent-primary/10 text-accent-primary'}`}>
              {item.kind === 'target' ? <Target size={16} /> : <TrendingDown size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold leading-4 text-text-primary">{item.title}</p>
              <p className="mt-1 text-[9px] leading-4 text-text-muted">{item.detail}</p>
            </div>
            {item.url ? <ExternalLink size={12} className="mt-1 shrink-0 text-text-muted" /> : null}
          </a>
        ))}

        {!notifications.length ? (
          <div className="p-8 text-center text-[10px] leading-5 text-text-muted">
            Nenhuma meta ou mudança real de preço para mostrar agora.
          </div>
        ) : null}
      </div>
    </div>
  )
}
