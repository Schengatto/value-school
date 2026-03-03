<script setup lang="ts">
import { Radar } from 'vue-chartjs'
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const { t } = useI18n()
const { titleColor, labelColor, borderColor } = useChartColors()

const COLORS = [
  { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', point: '#3b82f6' },
  { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', point: '#22c55e' },
  { bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', point: '#f97316' }
]

interface StockRadarData {
  symbol: string
  name: string
  fmpData: Record<string, any> | null
  fundamentalScore: number | null
  technicalScore: number | null
}

const props = defineProps<{
  stocks: StockRadarData[]
}>()

const normalize = (val: number, max: number) => Math.min(Math.max((val / max) * 100, 0), 100)

const chartData = computed(() => ({
  labels: ['ROE', t('compare.metrics.grossMargin'), t('compare.metrics.currentRatio'), t('compare.overview.fundamentalScore'), t('compare.overview.technicalScore')],
  datasets: props.stocks.map((stock, i) => {
    const metrics = stock.fmpData?.metrics ?? {}
    const ratios = stock.fmpData?.latestRatios ?? {}
    const color = COLORS[i] ?? COLORS[0]
    return {
      label: stock.symbol,
      data: [
        normalize(parseFloat(ratios.returnOnEquity ?? metrics.roe ?? 0) * 100, 30),
        normalize(parseFloat(metrics.grossProfitMargin ?? 0) * 100, 80),
        normalize(parseFloat(metrics.currentRatio ?? 0), 3),
        stock.fundamentalScore ?? 0,
        stock.technicalScore ?? 0
      ],
      backgroundColor: color.bg,
      borderColor: color.border,
      pointBackgroundColor: color.point,
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: color.border
    }
  })
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: { display: true, text: t('compare.sections.radarChart'), color: titleColor.value },
    legend: { display: true, labels: { color: labelColor.value } }
  },
  scales: {
    r: {
      beginAtZero: true,
      max: 100,
      ticks: { stepSize: 25, color: labelColor.value, backdropColor: 'transparent' },
      pointLabels: { color: labelColor.value },
      grid: { color: borderColor.value },
      angleLines: { color: borderColor.value }
    }
  }
}))
</script>

<template>
  <div class="h-80">
    <Radar :data="chartData" :options="chartOptions" />
  </div>
</template>
