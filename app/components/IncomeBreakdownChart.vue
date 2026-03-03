<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  fmpData: Record<string, any> | null
}>()

const latestReport = computed(() => {
  const reports = props.fmpData?.incomeStatement?.annualReports ?? []
  return reports.length > 0 ? reports[0] : null
})

const year = computed(() => latestReport.value?.date?.substring(0, 4) ?? '')

function fmt(value: number): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
  return `$${value.toLocaleString()}`
}

interface Segment {
  key: string
  label: string
  value: number
  pct: number
  type: 'cost' | 'profit'
}

const segments = computed<Segment[] | null>(() => {
  const r = latestReport.value
  if (!r) return null

  const revenue = r.totalRevenue ?? 0
  if (revenue <= 0) return null

  const costOfRevenue = r.costOfRevenue ?? (revenue - (r.grossProfit ?? 0))
  const grossProfit = r.grossProfit ?? (revenue - costOfRevenue)
  const opExpenses = grossProfit - (r.operatingIncome ?? 0)
  const operatingIncome = r.operatingIncome ?? (grossProfit - opExpenses)
  const otherCosts = operatingIncome - (r.netIncome ?? 0)
  const netIncome = r.netIncome ?? 0

  const items: Segment[] = []

  if (costOfRevenue > 0) {
    items.push({
      key: 'costOfRevenue',
      label: t('charts.breakdown.costOfRevenue'),
      value: costOfRevenue,
      pct: (costOfRevenue / revenue) * 100,
      type: 'cost'
    })
  }
  if (opExpenses > 0) {
    items.push({
      key: 'opExpenses',
      label: t('charts.breakdown.opExpenses'),
      value: opExpenses,
      pct: (opExpenses / revenue) * 100,
      type: 'cost'
    })
  }
  if (otherCosts > 0) {
    items.push({
      key: 'otherCosts',
      label: t('charts.breakdown.otherCosts'),
      value: otherCosts,
      pct: (otherCosts / revenue) * 100,
      type: 'cost'
    })
  }
  if (netIncome !== 0) {
    items.push({
      key: 'netIncome',
      label: t('charts.breakdown.netIncome'),
      value: netIncome,
      pct: (netIncome / revenue) * 100,
      type: netIncome > 0 ? 'profit' : 'cost'
    })
  }

  return items
})

const revenue = computed(() => {
  const r = latestReport.value
  return r?.totalRevenue ?? 0
})

const costColors = [
  { bg: 'bg-red-500/80 dark:bg-red-600/70', border: 'border-red-600 dark:border-red-500', text: 'text-white' },
  { bg: 'bg-orange-500/80 dark:bg-orange-600/70', border: 'border-orange-600 dark:border-orange-500', text: 'text-white' },
  { bg: 'bg-amber-500/80 dark:bg-amber-600/70', border: 'border-amber-600 dark:border-amber-500', text: 'text-white' }
]
const profitColor = { bg: 'bg-emerald-500/80 dark:bg-emerald-600/70', border: 'border-emerald-600 dark:border-emerald-500', text: 'text-white' }
const lossColor = { bg: 'bg-rose-700/80 dark:bg-rose-800/70', border: 'border-rose-800 dark:border-rose-700', text: 'text-white' }

function getColor(seg: Segment, idx: number) {
  if (seg.type === 'profit') return profitColor
  if (seg.key === 'netIncome' && seg.value < 0) return lossColor
  return costColors[idx % costColors.length]
}

function displayPct(pct: number): number {
  return Math.max(Math.abs(pct), 5)
}
</script>

<template>
  <div>
    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
      <UIcon name="i-lucide-pie-chart" class="text-blue-500" />
      {{ t('charts.breakdown.title') }}
      <span v-if="year" class="text-xs font-normal text-gray-400 dark:text-gray-500">({{ year }})</span>
    </h4>

    <div v-if="segments && revenue > 0">
      <div class="mb-3">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-gray-600 dark:text-gray-400">{{ t('charts.breakdown.revenue') }}</span>
          <span class="text-xs font-bold text-blue-600 dark:text-blue-400">{{ fmt(revenue) }}</span>
        </div>
        <div class="h-2 rounded-full bg-blue-500/80 dark:bg-blue-600/70 w-full" />
      </div>

      <div class="flex gap-0.5 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700" style="min-height: 7rem;">
        <div
          v-for="(seg, idx) in segments"
          :key="seg.key"
          class="relative flex flex-col items-center justify-center p-1.5 sm:p-2 transition-all border-r last:border-r-0"
          :class="[getColor(seg, idx).bg, getColor(seg, idx).border, getColor(seg, idx).text]"
          :style="{ width: displayPct(seg.pct) + '%', minWidth: '3rem' }"
          :title="`${seg.label}: ${fmt(seg.value)} (${seg.pct.toFixed(1)}%)`"
        >
          <span class="text-[10px] sm:text-xs font-semibold leading-tight text-center line-clamp-2 opacity-95">
            {{ seg.label }}
          </span>
          <span class="text-xs sm:text-sm font-bold mt-0.5">
            {{ fmt(seg.value) }}
          </span>
          <span class="text-[10px] sm:text-xs opacity-80 font-medium">
            {{ seg.pct.toFixed(1) }}%
          </span>
        </div>
      </div>

      <div class="flex items-center gap-4 mt-2.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
        <div class="flex items-center gap-1">
          <span class="inline-block w-2.5 h-2.5 rounded-sm bg-red-500/80 dark:bg-red-600/70" />
          <span>{{ t('charts.breakdown.costs') }}</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500/80 dark:bg-emerald-600/70" />
          <span>{{ t('charts.breakdown.netIncome') }}</span>
        </div>
      </div>
    </div>

    <p v-else class="text-gray-400 dark:text-gray-500 text-center py-10">
      {{ $t('charts.noIncomeData') }}
    </p>
  </div>
</template>
