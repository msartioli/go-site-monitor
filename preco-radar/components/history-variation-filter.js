'use client'

import { useEffect } from 'react'

const DATA_URL = 'https://sziaumkwyxodhtuaxlhg.supabase.co/functions/v1/dashboard-data'

function changedGroupKeys(products = [], history = []) {
  const productGroup = new Map(products.map((product) => [product.id, product.group_key || product.model || product.id]))
  const pricesByProduct = new Map()

  for (const item of history) {
    const price = Number(item.price)
    if (!Number.isFinite(price)) continue
    if (!pricesByProduct.has(item.product_id)) pricesByProduct.set(item.product_id, [])
    const prices = pricesByProduct.get(item.product_id)
    if (!prices.some((value) => Math.abs(value - price) < 0.01)) prices.push(price)
  }

  const changed = new Set()
  for (const [productId, prices] of pricesByProduct) {
    if (prices.length >= 2) {
      const groupKey = productGroup.get(productId)
      if (groupKey) changed.add(groupKey)
    }
  }

  return changed
}

function applyHistoryFilter(changed) {
  const selects = [...document.querySelectorAll('select')]
  const modelSelects = selects.filter((select) => {
    const values = [...select.options].map((option) => option.value)
    return values.some((value) => changed.has(value)) && values.length >= 3
  })

  for (const select of modelSelects) {
    let firstVisible = null
    let currentVisible = false

    for (const option of [...select.options]) {
      const visible = changed.has(option.value)
      option.hidden = !visible
      option.disabled = !visible
      if (visible && !firstVisible) firstVisible = option.value
      if (visible && select.value === option.value) currentVisible = true
    }

    if (!currentVisible && firstVisible) {
      select.value = firstVisible
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }
}

export default function HistoryVariationFilter() {
  useEffect(() => {
    let cancelled = false
    let changed = new Set()

    const refresh = async () => {
      try {
        const response = await fetch(`${DATA_URL}?history_filter=${Date.now()}`, { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json()
        if (cancelled) return
        changed = changedGroupKeys(payload.products || [], payload.history || [])
        applyHistoryFilter(changed)
      } catch {
        // O dashboard continua funcionando normalmente se o filtro auxiliar falhar.
      }
    }

    refresh()
    const observer = new MutationObserver(() => applyHistoryFilter(changed))
    observer.observe(document.body, { childList: true, subtree: true })
    const timer = window.setInterval(refresh, 60000)

    return () => {
      cancelled = true
      observer.disconnect()
      window.clearInterval(timer)
    }
  }, [])

  return null
}
