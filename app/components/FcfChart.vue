<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const { t } = useI18n()
const { titleColor, labelColor, gridColor } = useChartColors()

const props = defineProps<{
  fmpData: Record<string, any> | null
}>()

const chartData = computed(() => {
  const reports = props.fmpData?.cashFlowStatement?.annualReports ?? []
  const sorted = [...reports].reverse()
  const labels = formatPeriodLabels(sorted.map((r: any) => r.date))

  return {
    labels,
    datasets: [{
      label: t('charts.fcfLabel'),
      data: sorted.map((r: any) => r.freeCashFlow),
      backgroundColor: sorted.map((r: any) =>
        r.freeCashFlow >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
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
    title: { display: true, text: t('charts.fcf'), color: titleColor.value }
  },
  scales: {
    x: { ticks: { color: labelColor.value }, grid: { color: gridColor.value } },
    y: {
      ticks: {
        color: labelColor.value,
        callback: (value: number) => {
          if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
          if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
          return `$${value}`
        }
      },
      grid: { color: gridColor.value }
    }
  }
}))
</script>

<template>
  <div class="h-64">
    <Bar v-if="fmpData?.cashFlowStatement?.annualReports?.length" :data="chartData" :options="chartOptions" />
    <p v-else class="text-gray-400 dark:text-gray-500 text-center pt-20">{{ $t('charts.noCashFlowData') }}</p>
  </div>
</template>
