<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  pricesDaily: Array<{ date: string | Date, close: number }> | null
}>()

const { bgColor, labelColor, gridColor, borderColor } = useChartColors()

const chartContainer = ref<HTMLElement | null>(null)
let chart: any = null

function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const rsiValues: (number | null)[] = []

  if (closes.length < period + 1) {
    return closes.map(() => null)
  }

  // Calculate initial gains and losses
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const change = closes[i]! - closes[i - 1]!
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }
  avgGain /= period
  avgLoss /= period

  // First period values are null
  for (let i = 0; i <= period; i++) {
    rsiValues.push(null)
  }

  // Calculate RSI for each subsequent period
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  rsiValues[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs))

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    const currentRs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsiValues.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + currentRs)))
  }

  return rsiValues
}

async function initChart() {
  if (!chartContainer.value || !props.pricesDaily?.length) return

  const { createChart, LineStyle } = await import('lightweight-charts')

  if (chart) {
    chart.remove()
    chart = null
  }

  chart = createChart(chartContainer.value, {
    width: chartContainer.value.clientWidth,
    height: 150,
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
    },
    rightPriceScale: {
      autoScale: false,
      scaleMargins: { top: 0.05, bottom: 0.05 }
    }
  })

  // RSI line series
  const rsiSeries = chart.addLineSeries({
    color: '#8b5cf6',
    lineWidth: 2,
    priceFormat: { type: 'custom', formatter: (v: number) => v.toFixed(1) }
  })

  const sorted = [...props.pricesDaily]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const closes = sorted.map(p => p.close)
  const rsiValues = calculateRSI(closes)

  const rsiData = sorted
    .map((p, i) => ({
      time: new Date(p.date).toISOString().split('T')[0],
      value: rsiValues[i]
    }))
    .filter(d => d.value != null) as Array<{ time: string, value: number }>

  rsiSeries.setData(rsiData)

  // Oversold line (30)
  rsiSeries.createPriceLine({
    price: 30,
    color: '#22c55e',
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: ''
  })

  // Overbought line (70)
  rsiSeries.createPriceLine({
    price: 70,
    color: '#ef4444',
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: ''
  })

  // Middle line (50)
  rsiSeries.createPriceLine({
    price: 50,
    color: gridColor.value,
    lineWidth: 1,
    lineStyle: LineStyle.Dotted,
    axisLabelVisible: false,
    title: ''
  })

  // Fix scale to 0-100
  rsiSeries.applyOptions({
    autoscaleInfoProvider: () => ({
      priceRange: { minValue: 0, maxValue: 100 }
    })
  })

  chart.timeScale().fitContent()
}

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
    <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
      {{ t('charts.rsiChart') }}
      <span class="flex items-center gap-3 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-normal">
        <span class="flex items-center gap-1">
          <span class="inline-block w-3 h-0.5 bg-green-500 rounded" />
          Oversold (30)
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block w-3 h-0.5 bg-red-500 rounded" />
          Overbought (70)
        </span>
      </span>
    </h3>
    <div ref="chartContainer" class="w-full" />
    <p v-if="!pricesDaily?.length" class="text-gray-400 dark:text-gray-500 text-center py-6">{{ $t('charts.noPriceData') }}</p>
  </div>
</template>
