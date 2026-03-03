<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const { t } = useI18n()
const { titleColor, labelColor, gridColor } = useChartColors()

const props = defineProps<{
  annualDividends: Array<{ year: number, totalPerShare: number, growthYoY: number | null }> | null
}>()

const chartData = computed(() => {
  const dividends = props.annualDividends ?? []
  return {
    labels: dividends.map(d => String(d.year)),
    datasets: [{
      label: t('company.dividendPerShare'),
      data: dividends.map(d => d.totalPerShare),
      backgroundColor: dividends.map((d, i) => {
        if (i === 0) return 'rgba(59, 130, 246, 0.7)' // blue for first year
        return (d.growthYoY != null && d.growthYoY >= 0)
          ? 'rgba(34, 197, 94, 0.7)'   // green for growth
          : 'rgba(239, 68, 68, 0.7)'    // red for decline
      }),
      borderRadius: 4
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: true, text: t('company.dividendHistory'), color: titleColor.value },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const div = props.annualDividends?.[ctx.dataIndex]
          const value = `$${ctx.parsed.y.toFixed(3)}`
          if (div?.growthYoY != null) {
            const sign = div.growthYoY >= 0 ? '+' : ''
            return `${value} (${sign}${div.growthYoY.toFixed(1)}% YoY)`
          }
          return value
        }
      }
    }
  },
  scales: {
    x: { ticks: { color: labelColor.value }, grid: { color: gridColor.value } },
    y: {
      beginAtZero: true,
      ticks: {
        color: labelColor.value,
        callback: (val: number) => `$${val.toFixed(2)}`
      },
      grid: { color: gridColor.value }
    }
  }
}))
</script>

<template>
  <div class="h-64">
    <Bar v-if="annualDividends?.length" :data="chartData" :options="chartOptions" />
    <p v-else class="text-gray-400 dark:text-gray-500 text-center pt-20">{{ $t('company.noDividendData') }}</p>
  </div>
</template>
