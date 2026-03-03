<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import type { InsiderSentiment } from '~~/shared/types/stock'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const { t } = useI18n()
const { titleColor, labelColor, gridColor } = useChartColors()

const props = defineProps<{
  sentiment: InsiderSentiment[] | null
}>()

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const chartData = computed(() => {
  const data = props.sentiment ?? []
  const sorted = [...data].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)

  return {
    labels: sorted.map(s => `${MONTH_LABELS[s.month - 1]} ${s.year}`),
    datasets: [{
      label: t('managementQuality.insiderSentiment'),
      data: sorted.map(s => s.change),
      backgroundColor: sorted.map(s =>
        s.change >= 0
          ? 'rgba(34, 197, 94, 0.7)'   // green for net buying
          : 'rgba(239, 68, 68, 0.7)'    // red for net selling
      ),
      borderRadius: 4
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: t('managementQuality.insiderSentiment'),
      color: titleColor.value
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const entry = (props.sentiment ?? [])[ctx.dataIndex]
          const shares = ctx.parsed.y.toLocaleString()
          const mspr = entry?.mspr != null ? ` (MSPR: ${entry.mspr.toFixed(2)})` : ''
          return `${shares} shares${mspr}`
        }
      }
    }
  },
  scales: {
    x: { ticks: { color: labelColor.value }, grid: { color: gridColor.value } },
    y: {
      ticks: {
        color: labelColor.value,
        callback: (val: number) => val.toLocaleString()
      },
      grid: { color: gridColor.value }
    }
  }
}))
</script>

<template>
  <div class="h-64">
    <Bar v-if="sentiment?.length" :data="chartData" :options="chartOptions" />
    <p v-else class="text-gray-400 dark:text-gray-500 text-center pt-20">{{ $t('managementQuality.noSentimentData') }}</p>
  </div>
</template>
