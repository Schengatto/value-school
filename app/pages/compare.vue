<script setup lang="ts">
import type { StockDetailResponse } from '~~/shared/types/api'
import type { StockCategory } from '~~/shared/types/stock'

useHead({ title: 'Stock Comparison - Value School' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const categoryColors: Record<StockCategory, string> = {
  value: 'info',
  growth: 'success',
  garp: 'warning',
  speculative: 'error'
}

const selectedSymbols = ref<string[]>([])
const searchInput = ref('')
const searchResults = ref<Array<{ symbol: string; name: string }>>([])
const showDropdown = ref(false)
const loading = ref(false)

let searchTimeout: ReturnType<typeof setTimeout>
watch(searchInput, (val) => {
  clearTimeout(searchTimeout)
  if (!val || val.length < 1) {
    searchResults.value = []
    showDropdown.value = false
    return
  }
  searchTimeout = setTimeout(async () => {
    const res = await $fetch<any>('/api/stocks/screener', {
      query: { search: val, limit: 5 }
    })
    searchResults.value = (res?.data ?? [])
      .filter((s: any) => !selectedSymbols.value.includes(s.symbol))
      .map((s: any) => ({ symbol: s.symbol, name: s.name }))
    showDropdown.value = searchResults.value.length > 0
  }, 300)
})

function selectStock(item: { symbol: string; name: string }) {
  if (selectedSymbols.value.length >= 3) return
  if (selectedSymbols.value.includes(item.symbol)) return
  selectedSymbols.value = [...selectedSymbols.value, item.symbol]
  searchInput.value = ''
  searchResults.value = []
  showDropdown.value = false
}

function removeStock(symbol: string) {
  selectedSymbols.value = selectedSymbols.value.filter(s => s !== symbol)
}

onMounted(() => {
  const q = route.query.symbols as string
  if (q) {
    selectedSymbols.value = q.split(',').filter(Boolean).slice(0, 3)
  }
})

watch(selectedSymbols, (symbols) => {
  if (symbols.length > 0) {
    router.replace({ query: { symbols: symbols.join(',') } })
  } else {
    router.replace({ query: undefined })
  }
})

const stocksData = ref<StockDetailResponse[]>([])
const fetchStatus = ref<'idle' | 'loading' | 'done'>('idle')

watch(selectedSymbols, async (symbols) => {
  if (symbols.length < 2) {
    stocksData.value = []
    fetchStatus.value = 'idle'
    return
  }
  fetchStatus.value = 'loading'
  try {
    const results = await Promise.all(
      symbols.map(s => $fetch<StockDetailResponse>(`/api/stocks/${s}`))
    )
    stocksData.value = results
    fetchStatus.value = 'done'
  } catch {
    stocksData.value = []
    fetchStatus.value = 'done'
  }
}, { immediate: true })

const { startTour } = useCompareTour()
const { showPrompt, dontAskAgain, dismissPrompt, startAndDismiss } = useTourPrompt()

type Direction = 'higher' | 'lower'

interface MetricDef {
  key: string
  label: string
  getter: (stock: StockDetailResponse) => number | null
  direction: Direction
  format: (v: number | null) => string
}

function formatNum(v: number | null, decimals = 1): string {
  if (v == null) return '-'
  return v.toFixed(decimals)
}

function formatPercent(v: number | null): string {
  if (v == null) return '-'
  return `${(v * 100).toFixed(1)}%`
}

function formatPrice(v: number | null): string {
  if (v == null) return '-'
  return `$${v.toFixed(2)}`
}

function formatFcf(v: number | null): string {
  if (v == null) return '-'
  const abs = Math.abs(v)
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}

const fundamentalMetrics = computed<MetricDef[]>(() => [
  { key: 'pe', label: t('compare.metrics.pe'), getter: s => s.pe, direction: 'lower', format: v => formatNum(v) },
  { key: 'roe', label: t('compare.metrics.roe'), getter: s => s.roe, direction: 'higher', format: v => formatPercent(v) },
  { key: 'grossMargin', label: t('compare.metrics.grossMargin'), getter: s => (s as any).fmpData?.metrics?.grossProfitMargin ?? null, direction: 'higher', format: v => formatPercent(v) },
  { key: 'operatingMargin', label: t('compare.metrics.operatingMargin'), getter: s => (s as any).fmpData?.metrics?.operatingProfitMargin ?? null, direction: 'higher', format: v => formatPercent(v) },
  { key: 'currentRatio', label: t('compare.metrics.currentRatio'), getter: s => s.currentRatio, direction: 'higher', format: v => formatNum(v) },
  { key: 'debtToEbitda', label: t('compare.metrics.debtToEbitda'), getter: s => s.debtToEbitda, direction: 'lower', format: v => formatNum(v) },
  { key: 'interestCoverage', label: t('compare.metrics.interestCoverage'), getter: s => s.interestCoverage, direction: 'higher', format: v => formatNum(v) },
  { key: 'fcf', label: t('compare.metrics.fcf'), getter: s => s.freeCashFlow, direction: 'higher', format: v => formatFcf(v) },
  { key: 'piotroski', label: t('compare.metrics.piotroski'), getter: s => s.piotroskiScore, direction: 'higher', format: v => v != null ? `${v}/9` : '-' },
  { key: 'earningsQuality', label: t('compare.metrics.earningsQuality'), getter: s => s.earningsQuality, direction: 'higher', format: v => formatNum(v) },
  { key: 'dataCompleteness', label: t('compare.metrics.dataCompleteness'), getter: s => s.dataCompleteness, direction: 'higher', format: v => v != null ? `${v.toFixed(0)}%` : '-' }
])

function highlightClass(metric: MetricDef, stock: StockDetailResponse): string {
  if (stocksData.value.length < 2) return ''
  const values = stocksData.value.map(s => metric.getter(s)).filter(v => v != null) as number[]
  if (values.length < 2) return ''
  const val = metric.getter(stock)
  if (val == null) return 'text-gray-400'

  // P/E special: negative is worst
  if (metric.key === 'pe' && val < 0) return 'text-red-600 dark:text-red-400'

  const best = metric.direction === 'higher' ? Math.max(...values) : Math.min(...values.filter(v => metric.key !== 'pe' || v > 0))
  const worst = metric.direction === 'higher' ? Math.min(...values) : Math.max(...values)

  if (val === best && best !== worst) return 'text-green-600 dark:text-green-400 font-medium'
  if (val === worst && best !== worst) return 'text-red-600 dark:text-red-400'
  return ''
}

const valuationMetrics = computed<MetricDef[]>(() => [
  { key: 'fairValue', label: t('compare.valuation.fairValue'), getter: s => s.fairValue, direction: 'higher', format: v => formatPrice(v) },
  { key: 'currentPrice', label: t('compare.valuation.currentPrice'), getter: s => s.currentPrice, direction: 'lower', format: v => formatPrice(v) },
  { key: 'marginOfSafety', label: t('compare.valuation.marginOfSafety'), getter: s => s.marginOfSafety, direction: 'higher', format: v => v != null ? `${v.toFixed(1)}%` : '-' }
])

const radarStocks = computed(() =>
  stocksData.value.map(s => ({
    symbol: s.symbol,
    name: s.name,
    fmpData: (s as any).fmpData,
    fundamentalScore: s.fundamentalScore,
    technicalScore: s.technicalScore
  }))
)

const priceStocks = computed(() =>
  stocksData.value.map(s => ({
    symbol: s.symbol,
    name: s.name,
    pricesDaily: (s as any).pricesDaily ?? []
  }))
)
</script>

<template>
  <div>
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-columns-3" class="text-green-600 dark:text-green-400 text-xl" />
            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{ $t('compare.title') }}
            </h2>
          </div>
          <div class="relative">
            <UButton variant="ghost" color="neutral" size="xs" icon="i-lucide-circle-help"
              @click="startTour">
              {{ $t('compare.guidedTour') }}
            </UButton>
            <TourPrompt
              :show="showPrompt"
              :dont-ask-again="dontAskAgain"
              @start="startAndDismiss(startTour)"
              @dismiss="dismissPrompt"
              @update:dont-ask-again="dontAskAgain = $event"
            />
          </div>
        </div>
      </template>
      <p class="text-gray-600 dark:text-gray-400 text-sm">
        {{ $t('compare.description') }}
      </p>
    </UCard>

    <div data-tour="stock-selector" class="mb-6 relative z-10">
      <UCard :ui="{ root: 'overflow-visible', body: 'overflow-visible' }">
        <template #header>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ $t('compare.addStock') }}
          </h3>
        </template>

        <div v-if="selectedSymbols.length > 0" class="flex flex-wrap gap-2 mb-4">
          <UBadge v-for="sym in selectedSymbols" :key="sym" color="info" variant="subtle" size="lg"
            class="flex items-center gap-1.5">
            {{ sym }}
            <button class="ml-1 hover:text-red-500 transition-colors" @click.stop="removeStock(sym)">
              <UIcon name="i-lucide-x" class="text-xs" />
            </button>
          </UBadge>
        </div>

        <div v-if="selectedSymbols.length < 3" class="relative">
          <UInput v-model="searchInput" :placeholder="$t('compare.searchPlaceholder')" icon="i-lucide-search"
            class="w-full max-w-md" @focus="showDropdown = searchResults.length > 0"
            @blur="setTimeout(() => showDropdown = false, 200)" />
          <div v-if="showDropdown"
            class="absolute z-50 mt-1 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
            <button v-for="item in searchResults" :key="item.symbol"
              class="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
              @mousedown.prevent="selectStock(item)">
              <span>
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ item.symbol }}</span>
                <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">{{ item.name }}</span>
              </span>
              <UIcon name="i-lucide-plus" class="text-gray-400" />
            </button>
          </div>
        </div>
        <p v-else class="text-xs text-gray-400">{{ $t('compare.maxStocks') }}</p>

        <p v-if="selectedSymbols.length < 2" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {{ $t('compare.selectAtLeast') }}
        </p>
      </UCard>
    </div>

    <div v-if="fetchStatus === 'loading'" class="text-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
      <p class="mt-2 text-gray-500 dark:text-gray-400">{{ $t('compare.loading') }}</p>
    </div>

    <template v-if="stocksData.length >= 2">

      <UCard data-tour="compare-overview" class="mb-6">
        <template #header>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ $t('compare.sections.overview') }}</h3>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="px-3 py-2 text-left text-gray-500 dark:text-gray-400 w-40" />
                <th v-for="stock in stocksData" :key="stock.symbol"
                  class="px-3 py-2 text-center font-semibold text-gray-900 dark:text-gray-100">
                  <NuxtLink :to="`/company/${stock.symbol}`" class="text-blue-600 hover:underline">
                    {{ stock.symbol }}
                  </NuxtLink>
                  <div class="text-xs font-normal text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{{ stock.name
                    }}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ $t('compare.overview.category') }}</td>
                <td v-for="stock in stocksData" :key="stock.symbol" class="px-3 py-2 text-center">
                  <UBadge v-if="stock.stockCategory" :color="categoryColors[stock.stockCategory] as any"
                    variant="subtle" size="xs">
                    {{ $t(`categories.${stock.stockCategory}`) }}
                  </UBadge>
                  <span v-else class="text-gray-400">-</span>
                </td>
              </tr>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ $t('compare.overview.sector') }}</td>
                <td v-for="stock in stocksData" :key="stock.symbol"
                  class="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                  {{ stock.sector ?? '-' }}
                </td>
              </tr>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ $t('compare.overview.price') }}</td>
                <td v-for="stock in stocksData" :key="stock.symbol"
                  class="px-3 py-2 text-center font-medium text-gray-900 dark:text-gray-100">
                  {{ formatPrice(stock.currentPrice) }}
                </td>
              </tr>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ $t('compare.overview.compositeScore') }}</td>
                <td v-for="stock in stocksData" :key="stock.symbol" class="px-3 py-2 text-center">
                  <ScoreBadge :score="stock.compositeScore"
                    :low-confidence="stock.dataCompleteness != null && stock.dataCompleteness < 40" />
                </td>
              </tr>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ $t('compare.overview.fundamentalScore') }}
                </td>
                <td v-for="stock in stocksData" :key="stock.symbol" class="px-3 py-2 text-center">
                  <ScoreBadge :score="stock.fundamentalScore"
                    :low-confidence="stock.dataCompleteness != null && stock.dataCompleteness < 40" />
                </td>
              </tr>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ $t('compare.overview.technicalScore') }}</td>
                <td v-for="stock in stocksData" :key="stock.symbol" class="px-3 py-2 text-center">
                  <ScoreBadge :score="stock.technicalScore" />
                </td>
              </tr>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ $t('compare.overview.signal') }}</td>
                <td v-for="stock in stocksData" :key="stock.symbol" class="px-3 py-2 text-center">
                  <SignalBadge :signal="stock.overallSignal" />
                </td>
              </tr>
              <tr>
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ $t('compare.overview.valuation') }}</td>
                <td v-for="stock in stocksData" :key="stock.symbol" class="px-3 py-2 text-center">
                  <ValuationBadge :signal="stock.valuationSignal" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UCard data-tour="compare-fundamentals" class="mb-6">
        <template #header>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ $t('compare.sections.fundamentals') }}
          </h3>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="px-3 py-2 text-left text-gray-500 dark:text-gray-400 w-40">{{ $t('compare.metrics.metric') }}
                </th>
                <th v-for="stock in stocksData" :key="stock.symbol"
                  class="px-3 py-2 text-center font-semibold text-gray-900 dark:text-gray-100">
                  {{ stock.symbol }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="metric in fundamentalMetrics" :key="metric.key"
                class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ metric.label }}</td>
                <td v-for="stock in stocksData" :key="stock.symbol" class="px-3 py-2 text-center"
                  :class="highlightClass(metric, stock)">
                  {{ metric.format(metric.getter(stock)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UCard data-tour="compare-valuation" class="mb-6">
        <template #header>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ $t('compare.sections.valuation') }}</h3>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="px-3 py-2 text-left text-gray-500 dark:text-gray-400 w-40">{{ $t('compare.metrics.metric') }}
                </th>
                <th v-for="stock in stocksData" :key="stock.symbol"
                  class="px-3 py-2 text-center font-semibold text-gray-900 dark:text-gray-100">
                  {{ stock.symbol }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="metric in valuationMetrics" :key="metric.key"
                class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ metric.label }}</td>
                <td v-for="stock in stocksData" :key="stock.symbol" class="px-3 py-2 text-center"
                  :class="highlightClass(metric, stock)">
                  {{ metric.format(metric.getter(stock)) }}
                </td>
              </tr>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ $t('compare.valuation.signal') }}</td>
                <td v-for="stock in stocksData" :key="stock.symbol" class="px-3 py-2 text-center">
                  <ValuationBadge :signal="stock.valuationSignal" />
                </td>
              </tr>
              <tr>
                <td class="px-3 py-2 text-gray-500 dark:text-gray-400">{{ $t('compare.valuation.fairValueRange') }}</td>
                <td v-for="stock in stocksData" :key="stock.symbol"
                  class="px-3 py-2 text-center text-gray-600 dark:text-gray-400">
                  {{ stock.fairValueLow != null && stock.fairValueHigh != null ? `$${stock.fairValueLow.toFixed(0)} -
                  $${stock.fairValueHigh.toFixed(0)}` : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <UCard data-tour="compare-radar">
          <template #header>
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ $t('compare.sections.radarChart') }}
            </h3>
          </template>
          <ClientOnly>
            <ComparisonRadarChart :stocks="radarStocks" />
          </ClientOnly>
        </UCard>

        <UCard data-tour="compare-price">
          <template #header>
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ $t('compare.sections.priceChart') }}
            </h3>
          </template>
          <ClientOnly>
            <ComparisonPriceChart :stocks="priceStocks" />
          </ClientOnly>
        </UCard>
      </div>
    </template>
  </div>
</template>
