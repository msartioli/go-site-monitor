'use client'

import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const money = (value) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2,
      }).format(Number(value))

const shortDate = (value) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))

const fullDate = (value) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))

function PriceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="chart-tooltip rounded-2xl px-4 py-3 text-xs text-text-secondary">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
        {fullDate(point.iso)}
      </p>
      <p className="text-lg font-extrabold tracking-tight text-text-primary">
        {money(point.price)}
      </p>
      <p className="mt-1 text-[11px] text-text-secondary">
        {point.store || 'Menor preço observado'}
      </p>
      {point.readings ? (
        <p className="mt-1 text-[10px] text-text-muted">
          {point.readings} leitura{point.readings === 1 ? '' : 's'} no dia
        </p>
      ) : null}
    </div>
  )
}

export default function PriceHistoryChart({ data, targetPrice }) {
  const gradientId = `price-gradient-${useId().replace(/:/g, '')}`

  if (!data?.length) {
    return (
      <div className="flex min-h-[340px] items-center justify-center rounded-2xl border border-dashed border-border-soft bg-white/[0.02] px-6 text-center">
        <div>
          <p className="text-sm font-semibold text-text-secondary">
            Ainda não há histórico suficiente para esta seleção.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            As leituras automáticas vão formar a curva ao longo dos dias.
          </p>
        </div>
      </div>
    )
  }

  const prices = data.map((item) => Number(item.price)).filter(Number.isFinite)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const spread = Math.max(max - min, 1)
  const yMin = Math.max(0, min - spread * 0.18)
  const yMax = max + spread * 0.18

  return (
    <div className="h-[360px] w-full sm:h-[410px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 18, right: 14, left: 2, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--radar-success)" stopOpacity={0.36} />
              <stop offset="60%" stopColor="var(--radar-success)" stopOpacity={0.1} />
              <stop offset="100%" stopColor="var(--radar-success)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="rgba(255,255,255,.065)"
            strokeDasharray="4 8"
            vertical={false}
          />

          <XAxis
            dataKey="iso"
            axisLine={false}
            tickLine={false}
            minTickGap={28}
            tickFormatter={shortDate}
            tick={{ fill: 'var(--radar-text-muted)', fontSize: 10 }}
            dy={10}
          />

          <YAxis
            domain={[yMin, yMax]}
            axisLine={false}
            tickLine={false}
            width={68}
            tickFormatter={(value) =>
              Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
            }
            tick={{ fill: 'var(--radar-text-muted)', fontSize: 10 }}
          />

          {targetPrice ? (
            <ReferenceLine
              y={Number(targetPrice)}
              stroke="var(--radar-accent-primary)"
              strokeDasharray="7 7"
              strokeOpacity={0.7}
              label={{
                value: `Meta ${money(targetPrice)}`,
                position: 'insideTopRight',
                fill: 'var(--radar-accent-primary)',
                fontSize: 10,
              }}
            />
          ) : null}

          <Tooltip
            content={<PriceTooltip />}
            cursor={{
              stroke: 'rgba(94,225,255,.34)',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
            animationDuration={180}
          />

          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--radar-success)"
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            activeDot={{
              r: 6,
              fill: '#0B1020',
              stroke: 'var(--radar-success)',
              strokeWidth: 3,
            }}
            dot={data.length <= 12 ? { r: 3, fill: '#0B1020', strokeWidth: 2 } : false}
            isAnimationActive="auto"
            animationBegin={120}
            animationDuration={1100}
            animationEasing="cubic-bezier(.22,1,.36,1)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
