<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const { t } = useI18n()
const { titleColor, labelColor, gridColor } = useChartColors()

const props = defineProps<{
  epsHistory: Array<{ year: string, value: number }> | null
}>()

const chartData = computed(() => {
  const eps = props.epsHistory ?? []
  const sorted = [...eps].sort((a, b) => a.year.localeCompare(b.year))
  return {
    labels: formatPeriodLabels(sorted.map(e => e.year)),
    datasets: [{
      label: t('charts.epsLabel'),
      data: sorted.map(e => e.value),
      backgroundColor: sorted.map(e => e.value >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
      borderRadius: 4
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: true, text: t('charts.eps'), color: titleColor.value }
  },
  scales: {
    x: { ticks: { color: labelColor.value }, grid: { color: gridColor.value } },
    y: { beginAtZero: true, ticks: { color: labelColor.value }, grid: { color: gridColor.value } }
  }
}))
</script>

<template>
  <div class="h-64">
    <Bar v-if="epsHistory?.length" :data="chartData" :options="chartOptions" />
    <p v-else class="text-gray-400 dark:text-gray-500 text-center pt-20">{{ $t('charts.noEpsData') }}</p>
  </div>
</template>
