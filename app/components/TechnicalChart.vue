<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const { t } = useI18n()
const { titleColor, labelColor, gridColor } = useChartColors()

const props = defineProps<{
  pricesDaily: Array<{ date: string | Date, close: number }> | null
  technicalData: Record<string, any> | null
}>()

const chartData = computed(() => {
  const prices = props.pricesDaily ?? []
  const sorted = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const last200 = sorted.slice(-200)

  const closes = last200.map(p => p.close)
  const labels = last200.map(p => {
    const d = new Date(p.date)
    return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`
  })

  // Calculate SMA50 and SMA200
  const calcSMA = (data: number[], period: number, index: number) => {
    if (index < period - 1) return null
    const slice = data.slice(index - period + 1, index + 1)
    return slice.reduce((a, b) => a + b, 0) / period
  }

  const allCloses = sorted.map(p => p.close)
  const startIdx = sorted.length - last200.length
  const sma50Data = last200.map((_, i) => calcSMA(allCloses, 50, startIdx + i))
  const sma200Data = last200.map((_, i) => calcSMA(allCloses, 200, startIdx + i))

  return {
    labels,
    datasets: [
      {
        label: t('charts.close'),
        data: closes,
        borderColor: 'rgb(107, 114, 128)',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: t('charts.sma50'),
        data: sma50Data,
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        pointRadius: 0,
        borderDash: [5, 5]
      },
      {
        label: t('charts.sma200'),
        data: sma200Data,
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        pointRadius: 0,
        borderDash: [10, 5]
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: { display: true, text: t('charts.priceMovingAverages'), color: titleColor.value },
    legend: { labels: { color: labelColor.value } }
  },
  scales: {
    x: {
      ticks: { maxTicksLimit: 12, maxRotation: 0, color: labelColor.value },
      grid: { color: gridColor.value }
    },
    y: { ticks: { color: labelColor.value }, grid: { color: gridColor.value } }
  }
}))
</script>

<template>
  <div class="h-72">
    <Line v-if="pricesDaily?.length" :data="chartData" :options="chartOptions" />
    <p v-else class="text-gray-400 dark:text-gray-500 text-center pt-20">{{ $t('charts.noPriceData') }}</p>
  </div>
</template>
