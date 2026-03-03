<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  pricesDaily: Array<{ date: string | Date, open: number, high: number, low: number, close: number }> | null
}>()

const { bgColor, labelColor, gridColor, borderColor } = useChartColors()

const chartContainer = ref<HTMLElement | null>(null)
let chart: any = null

async function initChart() {
  if (!chartContainer.value || !props.pricesDaily?.length) return

  const { createChart } = await import('lightweight-charts')

  if (chart) {
    chart.remove()
    chart = null
  }

  chart = createChart(chartContainer.value, {
    width: chartContainer.value.clientWidth,
    height: 400,
    layout: {
      background: { color: bgColor.value },
      textColor: labelColor.value
    },
    grid: {
      vertLines: { color: gridColor.value },
      horzLines: { color: gridColor.value }
    },
    timeScale: {
      borderColor: borderColor.value
    }
  })

  const candleSeries = chart.addCandlestickSeries({
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderDownColor: '#ef4444',
    borderUpColor: '#22c55e',
    wickDownColor: '#ef4444',
    wickUpColor: '#22c55e'
  })

  const sorted = [...props.pricesDaily]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(p => ({
      time: new Date(p.date).toISOString().split('T')[0],
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close
    }))

  candleSeries.setData(sorted)
  chart.timeScale().fitContent()
}

// Re-init chart when color mode changes
watch([() => props.pricesDaily, bgColor], () => {
  initChart()
})

onMounted(() => {
  initChart()
})

onBeforeUnmount(() => {
  if (chart) {
    chart.remove()
    chart = null
  }
})
</script>

<template>
  <div>
    <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{{ $t('charts.priceChart') }}</h3>
    <div ref="chartContainer" class="w-full" />
    <p v-if="!pricesDaily?.length" class="text-gray-400 dark:text-gray-500 text-center py-10">{{ $t('charts.noPriceData') }}</p>
  </div>
</template>
