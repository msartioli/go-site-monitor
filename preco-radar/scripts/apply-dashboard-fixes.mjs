import fs from 'node:fs'
import path from 'node:path'

const file = path.join(process.cwd(), 'components', 'radar-dashboard.js')
let source = fs.readFileSync(file, 'utf8')

if (source.includes('function hasBestPriceVariation(')) {
  console.log('Dashboard behavior fixes already applied.')
  process.exit(0)
}

function replaceOrThrow(from, to, label) {
  if (!source.includes(from)) {
    throw new Error(`Dashboard patch failed: ${label}`)
  }
  source = source.replace(from, to)
}

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

fs.writeFileSync(file, source)
console.log('Applied dashboard target ranking and real-history filtering fixes.')
