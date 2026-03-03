<script setup lang="ts">
import { Radar } from 'vue-chartjs'
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const { t } = useI18n()
const { titleColor, labelColor, borderColor } = useChartColors()

const props = defineProps<{
  fmpData: Record<string, any> | null
  fundamentalScore: number | null
  technicalScore: number | null
}>()

const chartData = computed(() => {
  const metrics = props.fmpData?.metrics ?? {}
  const ratios = props.fmpData?.latestRatios ?? {}

  // Normalize values to 0-100 scale for radar
  const normalize = (val: number, max: number) => Math.min(Math.max((val / max) * 100, 0), 100)

  return {
    labels: ['ROE', t('company.grossMargin'), t('company.currentRatio'), t('company.fundamental'), t('company.technicalLabel')],
    datasets: [{
      label: t('charts.companyMetrics'),
      data: [
        normalize(parseFloat(ratios.returnOnEquity ?? metrics.roe ?? 0) * 100, 30),
        normalize(parseFloat(metrics.grossProfitMargin ?? 0) * 100, 80),
        normalize(parseFloat(metrics.currentRatio ?? 0), 3),
        props.fundamentalScore ?? 0,
        props.technicalScore ?? 0
      ],
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: 'rgb(59, 130, 246)',
      pointBackgroundColor: 'rgb(59, 130, 246)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(59, 130, 246)'
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: { display: true, text: t('charts.profitabilityRadar'), color: titleColor.value },
    legend: { display: false }
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
  <div class="h-64">
    <Radar :data="chartData" :options="chartOptions" />
  </div>
</template>
