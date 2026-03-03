<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const { t } = useI18n()
const { titleColor, labelColor, borderColor } = useChartColors()

const LINE_COLORS = ['#3b82f6', '#22c55e', '#f97316']

interface StockPriceData {
  symbol: string
  name: string
  pricesDaily: Array<{ date: string | Date; close: number | null }>
}

const props = defineProps<{
  stocks: StockPriceData[]
}>()

const chartData = computed(() => {
  // Get last 6 months of data for each stock
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const stockSeries = props.stocks.map((stock) => {
    const filtered = (stock.pricesDaily ?? [])
      .filter(p => new Date(p.date) >= sixMonthsAgo && p.close != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const firstClose = filtered[0]?.close ?? 1
    return {
      symbol: stock.symbol,
      points: filtered.map(p => ({
        date: new Date(p.date).toISOString().split('T')[0],
        value: ((p.close ?? firstClose) / firstClose) * 100
      }))
    }
  })

  // Use the longest date set as labels
  const allDates = new Set<string>()
  for (const s of stockSeries) {
    for (const p of s.points) allDates.add(p.date)
  }
  const labels = [...allDates].sort()

  // Build datasets, aligning each stock to the common date axis
  const datasets = stockSeries.map((s, i) => {
    const dateMap = new Map(s.points.map(p => [p.date, p.value]))
    return {
      label: s.symbol,
      data: labels.map(d => dateMap.get(d) ?? null),
      borderColor: LINE_COLORS[i] ?? LINE_COLORS[0],
      backgroundColor: LINE_COLORS[i] ?? LINE_COLORS[0],
      tension: 0.1,
      fill: false,
      pointRadius: 0,
      borderWidth: 2,
      spanGaps: true
    }
  })

  // Show only ~20 labels to avoid clutter
  const step = Math.max(1, Math.floor(labels.length / 20))
  const displayLabels = labels.map((l, i) => i % step === 0 ? l : '')

  return { labels: displayLabels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    title: { display: true, text: t('compare.chart.normalizedPrice'), color: titleColor.value },
    legend: { display: true, labels: { color: labelColor.value } },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1) ?? '-'}`
      }
    }
  },
  scales: {
    x: {
      ticks: { color: labelColor.value, maxRotation: 45 },
      grid: { color: borderColor.value }
    },
    y: {
      ticks: { color: labelColor.value, callback: (v: any) => `${v}` },
      grid: { color: borderColor.value }
    }
  }
}))

const hasData = computed(() => props.stocks.some(s => (s.pricesDaily?.length ?? 0) > 0))
</script>

<template>
  <div v-if="hasData" class="h-96">
    <Line :data="chartData" :options="chartOptions" />
  </div>
  <div v-else class="text-center py-8 text-gray-400">
    {{ t('compare.chart.noData') }}
  </div>
</template>
