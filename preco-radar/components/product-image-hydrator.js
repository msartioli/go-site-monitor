'use client'

import { useEffect } from 'react'

const DATA_URL = 'https://sziaumkwyxodhtuaxlhg.supabase.co/functions/v1/dashboard-data'

const IMAGE_OVERRIDES = {
  'acer-nitro-v15-anv15-51-7037':
    'https://a-static.mlcdn.com.br/800x600/notebook-gamer-acer-nitro-v-anv15-51-7037-i7-13agen-linux-gutta-16gb-512gb-ssd-rtx4050-15-6-fhd/aceroficial/1309/b0d6d9c3a26a156d456a94e6477dd5a8.jpeg',
  'acer-nitro-v15-anv15-52-57mc':
    'https://acerstore.vtexassets.com/arquivos/ids/167341-800-auto?aspect=true&height=auto&v=639168117945700000&width=800',
  'acer-nitro-v15-anv15-52-778t':
    'https://acerstore.vtexassets.com/arquivos/ids/167189-800-auto?aspect=true&height=auto&v=639154262513800000&width=800',
  'alienware-16-aurora-ac16250-rtx4050':
    'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/alienware-notebooks/ac16250/media-gallery/laptop-alienware-ac16250-gallery-1.psd?chrss=full&fmt=png-alpha&hei=402&pscan=auto&qlt=100%2C1&resMode=sharp2&scl=1&size=488%2C402&wid=488',
}

const BAD_IMAGE_PARTS = [
  'logo',
  'favicon',
  'sprite',
  'badge',
  'payment',
  'delltech-logo',
  'logonewblack',
  'brandmark',
  'anatel',
]

function isRealProductImage(value) {
  if (!value || typeof value !== 'string') return false
  if (!/^https?:\/\//i.test(value)) return false
  const lower = value.toLowerCase()
  return !BAD_IMAGE_PARTS.some((part) => lower.includes(part))
}

function normalizeGroups(products) {
  const map = new Map()

  for (const product of products || []) {
    const key = product.group_key || product.model || product.id
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: product.group_name || product.name || '',
        model: product.model || '',
        offers: [],
      })
    }
    map.get(key).offers.push(product)
  }

  return [...map.values()].map((group) => {
    const candidates = group.offers
      .filter((offer) => isRealProductImage(offer.image_url))
      .sort((a, b) => {
        const aLive = a.active && a.current_price != null && !a.last_error ? 0 : 1
        const bLive = b.active && b.current_price != null && !b.last_error ? 0 : 1
        if (aLive !== bLive) return aLive - bLive
        const aOfficial = /acer|asus|dell|avell|apple/i.test(String(a.store || '')) ? 0 : 1
        const bOfficial = /acer|asus|dell|avell|apple/i.test(String(b.store || '')) ? 0 : 1
        return aOfficial - bOfficial
      })

    return {
      ...group,
      image: IMAGE_OVERRIDES[group.key] || candidates[0]?.image_url || null,
    }
  })
}

function applyImage(img, url, alt) {
  if (!img || !url || img.dataset.realProductImage === url) return

  img.removeAttribute('srcset')
  img.removeAttribute('sizes')
  img.src = url
  img.alt = alt || 'Foto real do notebook'
  img.dataset.realProductImage = url
  img.style.objectFit = 'contain'
  img.style.objectPosition = 'center'
  img.style.opacity = '0.96'
  img.style.background = '#f7f8fb'

  const parent = img.parentElement
  if (parent) parent.style.background = '#f7f8fb'
}

function matchesGroup(container, group) {
  const text = (container.textContent || '').toLowerCase()
  const name = group.name.toLowerCase()
  const model = group.model.toLowerCase()
  return (name && text.includes(name)) || (model && model.length >= 5 && text.includes(model))
}

function hydrateProductImages(groups) {
  if (!groups.length) return

  const cards = document.querySelectorAll('button.premium-card')
  for (const card of cards) {
    const group = groups.find((entry) => entry.image && matchesGroup(card, entry))
    if (!group) continue
    const img = card.querySelector('img')
    applyImage(img, group.image, group.name)
  }

  const drawers = document.querySelectorAll('aside')
  for (const drawer of drawers) {
    const group = groups.find((entry) => entry.image && matchesGroup(drawer, entry))
    if (!group) continue
    const img = drawer.querySelector('img')
    applyImage(img, group.image, group.name)
  }
}

export default function ProductImageHydrator() {
  useEffect(() => {
    let cancelled = false
    let groups = []
    let frame = 0

    const scheduleHydration = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => hydrateProductImages(groups))
    }

    const observer = new MutationObserver(scheduleHydration)
    observer.observe(document.body, { childList: true, subtree: true })

    fetch(`${DATA_URL}?images=${Date.now()}`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((payload) => {
        if (cancelled) return
        groups = normalizeGroups(payload.products || [])
        scheduleHydration()
      })
      .catch(() => {
        // O dashboard continua funcional mesmo se uma imagem externa falhar.
      })

    return () => {
      cancelled = true
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return null
}
