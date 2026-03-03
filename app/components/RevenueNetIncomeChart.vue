<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const { t } = useI18n()
const { titleColor, labelColor, gridColor } = useChartColors()

const props = defineProps<{
  fmpData: Record<string, any> | null
}>()

const chartData = computed(() => {
  const reports = props.fmpData?.incomeStatement?.annualReports ?? []
  const sorted = [...reports].reverse()
  const labels = formatPeriodLabels(sorted.map((r: any) => r.date))

  return {
    labels,
    datasets: [
      {
        label: t('charts.revenueLabel'),
        data: sorted.map((r: any) => r.totalRevenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true
      },
      {
        label: t('charts.netIncomeLabel'),
        data: sorted.map((r: any) => r.netIncome),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
        fill: true
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: { display: true, text: t('charts.revenueVsNetIncome'), color: titleColor.value },
    legend: { labels: { color: labelColor.value } }
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
    <Line v-if="fmpData?.incomeStatement?.annualReports?.length" :data="chartData" :options="chartOptions" />
    <p v-else class="text-gray-400 dark:text-gray-500 text-center pt-20">{{ $t('charts.noIncomeData') }}</p>
  </div>
</template>
