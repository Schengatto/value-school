<script setup lang="ts">
import type { StockCategory, ScreenerItem } from '~~/shared/types/stock'

useHead({ title: 'Value School - Screener' })

const { t } = useI18n()
const { startScreenerTour } = useScreenerTour()
const { showPrompt, dontAskAgain, dismissPrompt, startAndDismiss } = useTourPrompt()
const route = useRoute()
const router = useRouter()

const categoryColors: Record<StockCategory, string> = {
  value: 'info',
  growth: 'success',
  garp: 'warning',
  speculative: 'error'
}

const showCriteria = ref(false)

const searchInput = ref('')
const search = ref('')
const sector = ref('all')
const signal = ref('all')
const categories = ref<string[]>([])
const valuationSignal = ref('all')
const compositeScoreMin = ref<number | undefined>(undefined)
const compositeScoreMax = ref<number | undefined>(undefined)
const fundamentalScoreMin = ref<number | undefined>(undefined)
const fundamentalScoreMax = ref<number | undefined>(undefined)
const technicalScoreMin = ref<number | undefined>(undefined)
const technicalScoreMax = ref<number | undefined>(undefined)
const marginOfSafetyMin = ref<number | undefined>(undefined)
const marginOfSafetyMax = ref<number | undefined>(undefined)
const piotroskiScoreMin = ref<number | undefined>(undefined)
const dataCompletenessMin = ref<number | undefined>(undefined)

const page = ref(1)
const sort = ref('compositeScore')
const order = ref<'asc' | 'desc'>('desc')

const showAdvanced = ref(false)
const activePreset = ref<string | null>(null)

let searchTimeout: ReturnType<typeof setTimeout>
watch(searchInput, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    search.value = val
    page.value = 1
  }, 300)
})

interface ScreenerPreset {
  key: string
  icon: string
  color: string
  filters: Partial<{
    categories: string[]
    signal: string
    valuationSignal: string
    compositeScoreMin: number
    fundamentalScoreMin: number
    technicalScoreMin: number
    marginOfSafetyMin: number
    piotroskiScoreMin: number
    dataCompletenessMin: number
  }>
}

const presets: ScreenerPreset[] = [
  {
    key: 'valuePicks',
    icon: 'i-lucide-gem',
    color: 'info',
    filters: {
      categories: ['value'],
      fundamentalScoreMin: 60,
      marginOfSafetyMin: 0
    }
  },
  {
    key: 'growthStars',
    icon: 'i-lucide-rocket',
    color: 'success',
    filters: {
      categories: ['growth'],
      compositeScoreMin: 65
    }
  },
  {
    key: 'qualityStocks',
    icon: 'i-lucide-shield-check',
    color: 'warning',
    filters: {
      piotroskiScoreMin: 7,
      dataCompletenessMin: 60
    }
  },
  {
    key: 'undervalued',
    icon: 'i-lucide-tag',
    color: 'error',
    filters: {
      valuationSignal: 'undervalued',
      fundamentalScoreMin: 50
    }
  }
]

function applyPreset(preset: ScreenerPreset) {
  resetFilters()
  const f = preset.filters
  if (f.categories) categories.value = f.categories
  if (f.signal) signal.value = f.signal
  if (f.valuationSignal) valuationSignal.value = f.valuationSignal
  if (f.compositeScoreMin != null) compositeScoreMin.value = f.compositeScoreMin
  if (f.fundamentalScoreMin != null) fundamentalScoreMin.value = f.fundamentalScoreMin
  if (f.technicalScoreMin != null) technicalScoreMin.value = f.technicalScoreMin
  if (f.marginOfSafetyMin != null) marginOfSafetyMin.value = f.marginOfSafetyMin
  if (f.piotroskiScoreMin != null) {
    piotroskiScoreMin.value = f.piotroskiScoreMin
    showAdvanced.value = true
  }
  if (f.dataCompletenessMin != null) {
    dataCompletenessMin.value = f.dataCompletenessMin
    showAdvanced.value = true
  }
  activePreset.value = preset.key
  page.value = 1
}

function resetFilters() {
  searchInput.value = ''
  search.value = ''
  sector.value = 'all'
  signal.value = 'all'
  categories.value = []
  valuationSignal.value = 'all'
  compositeScoreMin.value = undefined
  compositeScoreMax.value = undefined
  fundamentalScoreMin.value = undefined
  fundamentalScoreMax.value = undefined
  technicalScoreMin.value = undefined
  technicalScoreMax.value = undefined
  marginOfSafetyMin.value = undefined
  marginOfSafetyMax.value = undefined
  piotroskiScoreMin.value = undefined
  dataCompletenessMin.value = undefined
  activePreset.value = null
  page.value = 1
}

function toggleCategory(cat: string) {
  const idx = categories.value.indexOf(cat)
  if (idx >= 0) {
    categories.value = categories.value.filter(c => c !== cat)
  } else {
    categories.value = [...categories.value, cat]
  }
  page.value = 1
}

const activeFilterCount = computed(() => {
  let count = 0
  if (search.value) count++
  if (sector.value !== 'all') count++
  if (signal.value !== 'all') count++
  if (categories.value.length > 0) count++
  if (valuationSignal.value !== 'all') count++
  if (compositeScoreMin.value != null) count++
  if (compositeScoreMax.value != null) count++
  if (fundamentalScoreMin.value != null) count++
  if (fundamentalScoreMax.value != null) count++
  if (technicalScoreMin.value != null) count++
  if (technicalScoreMax.value != null) count++
  if (marginOfSafetyMin.value != null) count++
  if (marginOfSafetyMax.value != null) count++
  if (piotroskiScoreMin.value != null) count++
  if (dataCompletenessMin.value != null) count++
  return count
})

const queryParams = computed(() => {
  const params: Record<string, string | number> = {
    page: page.value,
    limit: 50,
    sort: sort.value,
    order: order.value
  }
  if (search.value) params.search = search.value
  if (sector.value !== 'all') params.sector = sector.value
  if (signal.value !== 'all') params.signal = signal.value
  if (categories.value.length > 0) params.category = categories.value.join(',')
  if (valuationSignal.value !== 'all') params.valuationSignal = valuationSignal.value
  if (compositeScoreMin.value != null) params.compositeScoreMin = compositeScoreMin.value
  if (compositeScoreMax.value != null) params.compositeScoreMax = compositeScoreMax.value
  if (fundamentalScoreMin.value != null) params.fundamentalScoreMin = fundamentalScoreMin.value
  if (fundamentalScoreMax.value != null) params.fundamentalScoreMax = fundamentalScoreMax.value
  if (technicalScoreMin.value != null) params.technicalScoreMin = technicalScoreMin.value
  if (technicalScoreMax.value != null) params.technicalScoreMax = technicalScoreMax.value
  if (marginOfSafetyMin.value != null) params.marginOfSafetyMin = marginOfSafetyMin.value
  if (marginOfSafetyMax.value != null) params.marginOfSafetyMax = marginOfSafetyMax.value
  if (piotroskiScoreMin.value != null) params.piotroskiScoreMin = piotroskiScoreMin.value
  if (dataCompletenessMin.value != null) params.dataCompletenessMin = dataCompletenessMin.value
  return params
})

const { data, status } = useScreener(queryParams)

const { data: sectorsData } = useFetch<string[]>('/api/stocks/sectors')
const sectorItems = computed(() => {
  const items = [{ label: t('stocks.allSectors'), value: 'all' }]
  if (sectorsData.value) {
    for (const s of sectorsData.value) {
      items.push({ label: s, value: s })
    }
  }
  return items
})

const signalItems = computed(() => [
  { label: t('stocks.allSignals'), value: 'all' },
  { label: t('stocks.positive'), value: 'positive' },
  { label: t('stocks.neutral'), value: 'neutral' },
  { label: t('stocks.negative'), value: 'negative' }
])

const valuationSignalItems = computed(() => [
  { label: t('screener.filters.allValuations'), value: 'all' },
  { label: t('screener.valuation.undervalued'), value: 'undervalued' },
  { label: t('screener.valuation.fairlyValued'), value: 'fairly_valued' },
  { label: t('screener.valuation.overvalued'), value: 'overvalued' }
])

const stocks = computed(() => data.value?.data ?? [])
const total = computed(() => data.value?.total ?? 0)
const totalPages = computed(() => Math.ceil(total.value / 50))

const sortItems = computed(() => [
  { label: t('screener.sort.compositeScore'), value: 'compositeScore' },
  { label: t('screener.sort.fundamentalScore'), value: 'fundamentalScore' },
  { label: t('screener.sort.technicalScore'), value: 'technicalScore' },
  { label: t('screener.sort.currentPrice'), value: 'currentPrice' },
  { label: t('screener.sort.name'), value: 'name' },
  { label: t('screener.sort.marginOfSafety'), value: 'marginOfSafety' },
  { label: t('screener.sort.piotroskiScore'), value: 'piotroskiScore' },
  { label: t('screener.sort.pe'), value: 'pe' },
  { label: t('screener.sort.roe'), value: 'roe' }
])

function toggleOrder() {
  order.value = order.value === 'desc' ? 'asc' : 'desc'
  page.value = 1
}

function onSortChange(value: string) {
  sort.value = value
  page.value = 1
}

onMounted(() => {
  const q = route.query
  if (q.search) { searchInput.value = q.search as string; search.value = q.search as string }
  if (q.sector) sector.value = q.sector as string
  if (q.signal) signal.value = q.signal as string
  if (q.category) categories.value = (q.category as string).split(',')
  if (q.valuationSignal) valuationSignal.value = q.valuationSignal as string
  if (q.compositeScoreMin) compositeScoreMin.value = parseInt(q.compositeScoreMin as string)
  if (q.fundamentalScoreMin) fundamentalScoreMin.value = parseInt(q.fundamentalScoreMin as string)
  if (q.technicalScoreMin) technicalScoreMin.value = parseInt(q.technicalScoreMin as string)
  if (q.marginOfSafetyMin) { marginOfSafetyMin.value = parseFloat(q.marginOfSafetyMin as string); showAdvanced.value = true }
  if (q.piotroskiScoreMin) { piotroskiScoreMin.value = parseInt(q.piotroskiScoreMin as string); showAdvanced.value = true }
  if (q.dataCompletenessMin) { dataCompletenessMin.value = parseInt(q.dataCompletenessMin as string); showAdvanced.value = true }
  if (q.preset) {
    const preset = presets.find(p => p.key === q.preset)
    if (preset) applyPreset(preset)
  }
})

watch(queryParams, (params) => {
  const urlParams: Record<string, string> = {}
  if (params.search) urlParams.search = String(params.search)
  if (params.sector) urlParams.sector = String(params.sector)
  if (params.signal) urlParams.signal = String(params.signal)
  if (params.category) urlParams.category = String(params.category)
  if (params.valuationSignal) urlParams.valuationSignal = String(params.valuationSignal)
  if (params.compositeScoreMin != null) urlParams.compositeScoreMin = String(params.compositeScoreMin)
  if (params.fundamentalScoreMin != null) urlParams.fundamentalScoreMin = String(params.fundamentalScoreMin)
  if (params.technicalScoreMin != null) urlParams.technicalScoreMin = String(params.technicalScoreMin)
  if (params.marginOfSafetyMin != null) urlParams.marginOfSafetyMin = String(params.marginOfSafetyMin)
  if (params.piotroskiScoreMin != null) urlParams.piotroskiScoreMin = String(params.piotroskiScoreMin)
  if (params.dataCompletenessMin != null) urlParams.dataCompletenessMin = String(params.dataCompletenessMin)
  if (activePreset.value) urlParams.preset = activePreset.value
  router.replace({ query: Object.keys(urlParams).length > 0 ? urlParams : undefined })
}, { deep: true })

function formatPrice(price: number | null): string {
  if (price == null) return '-'
  return `$${price.toFixed(2)}`
}

function formatPercent(value: number | null): string {
  if (value == null) return '-'
  return `${value.toFixed(1)}%`
}

function formatNumber(value: number | null, decimals = 1): string {
  if (value == null) return '-'
  return value.toFixed(decimals)
}

function mosColor(value: number | null): string {
  if (value == null) return 'text-gray-400'
  if (value >= 25) return 'text-green-600 dark:text-green-400 font-medium'
  if (value > 0) return 'text-green-600 dark:text-green-400'
  if (value > -20) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function piotroskiColor(score: number | null): string {
  if (score == null) return 'neutral'
  if (score >= 7) return 'success'
  if (score >= 5) return 'warning'
  return 'error'
}
</script>

<template>
  <div>
    <UCard class="mb-6" data-tour="screener-intro">
      <template #header>
        <div class="flex items-center justify-between relative">
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
            {{ $t('home.title') }}
          </h2>
          <UButton
            variant="outline"
            color="primary"
            size="sm"
            icon="i-lucide-compass"
            @click="startScreenerTour"
          >
            {{ $t('tour.startTour') }}
          </UButton>
          <TourPrompt
            :show="showPrompt"
            :dont-ask-again="dontAskAgain"
            @start="startAndDismiss(startScreenerTour)"
            @dismiss="dismissPrompt"
            @update:dont-ask-again="dontAskAgain = $event"
          />
        </div>
      </template>

      <p class="text-gray-600 dark:text-gray-400 mb-3">
        <i18n-t keypath="home.description1" tag="span">
          <template #buffett>
            <strong>Warren Buffett</strong>
          </template>
          <template #graham>
            <strong>Benjamin Graham</strong>
          </template>
        </i18n-t>
      </p>
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        <i18n-t keypath="home.description2" tag="span">
          <template #score>
            <strong>{{ $t('home.compositeScore') }}</strong>
          </template>
        </i18n-t>
      </p>

      <div>
        <button
          class="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
          @click="showCriteria = !showCriteria"
        >
          <UIcon name="i-lucide-bar-chart-3" />
          {{ $t('home.evaluationCriteria') }}
          <UIcon :name="showCriteria ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />
        </button>

        <div v-if="showCriteria" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <p class="mb-2">{{ $t('home.criteriaIntro') }}</p>
          <ul class="list-disc pl-5 space-y-1">
            <li>{{ $t('home.criteria.epsTrend') }}</li>
            <li>{{ $t('home.criteria.epsCagr') }}</li>
            <li>{{ $t('home.criteria.roic') }}</li>
            <li>{{ $t('home.criteria.grossMargin') }}</li>
            <li>{{ $t('home.criteria.pfcf') }}</li>
            <li>{{ $t('home.criteria.fcfPositive') }}</li>
            <li>{{ $t('home.criteria.dividendPayout') }}</li>
            <li>{{ $t('home.criteria.debtToEquity') }}</li>
            <li>{{ $t('home.criteria.operatingMargin') }}</li>
            <li>{{ $t('home.criteria.currentRatio') }}</li>
            <li>{{ $t('home.criteria.interestCoverage') }}</li>
            <li>{{ $t('home.criteria.debtEbitda') }}</li>
            <li>{{ $t('home.criteria.grahamNumber') }}</li>
            <li>{{ $t('home.criteria.dcf') }}</li>
          </ul>
        </div>
      </div>
    </UCard>

    <div class="flex flex-wrap gap-2 mb-6" data-tour="screener-presets">
      <UButton
        v-for="preset in presets"
        :key="preset.key"
        :icon="preset.icon"
        :color="activePreset === preset.key ? preset.color : 'neutral'"
        :variant="activePreset === preset.key ? 'solid' : 'outline'"
        size="sm"
        @click="applyPreset(preset)"
      >
        {{ $t(`screener.presets.${preset.key}`) }}
      </UButton>
    </div>

    <UCard class="mb-6" data-tour="screener-filters">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {{ $t('screener.filters.title') }}
          </h3>
          <div class="flex items-center gap-2">
            <UBadge v-if="activeFilterCount > 0" color="info" variant="subtle" size="xs">
              {{ activeFilterCount }} {{ $t('screener.filters.active', activeFilterCount) }}
            </UBadge>
            <UButton variant="ghost" color="neutral" size="xs" @click="resetFilters">
              {{ $t('common.reset') }}
            </UButton>
          </div>
        </div>
      </template>

      <div class="flex flex-wrap gap-3 mb-4">
        <UInput
          v-model="searchInput"
          :placeholder="$t('stocks.searchPlaceholder')"
          icon="i-lucide-search"
          class="flex-1 min-w-[200px]"
        />
        <div class="flex items-center gap-1">
          <USelect
            v-model="sector"
            :items="sectorItems"
            class="w-56"
            @update:model-value="page = 1"
          />
          <InfoHelper :title="$t('screener.help.sector.title')" :content="$t('screener.help.sector.content')" />
        </div>
        <div class="flex items-center gap-1">
          <USelect
            v-model="signal"
            :items="signalItems"
            class="w-40"
            @update:model-value="page = 1"
          />
          <InfoHelper :title="$t('screener.help.signal.title')" :content="$t('screener.help.signal.content')" />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 mb-4">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0 flex items-center gap-1">
            {{ $t('screener.filters.category') }}:
            <InfoHelper :title="$t('screener.help.category.title')" :content="$t('screener.help.category.content')" />
          </span>
          <div class="flex gap-1">
            <UButton
              v-for="cat in (['value', 'growth', 'garp', 'speculative'] as StockCategory[])"
              :key="cat"
              size="xs"
              :variant="categories.includes(cat) ? 'solid' : 'outline'"
              :color="categories.includes(cat) ? categoryColors[cat] : 'neutral'"
              @click="toggleCategory(cat)"
            >
              {{ $t(`categories.${cat}`) }}
            </UButton>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <USelect
            v-model="valuationSignal"
            :items="valuationSignalItems"
            class="w-48"
            @update:model-value="page = 1"
          />
          <InfoHelper :title="$t('screener.help.valuation.title')" :content="$t('screener.help.valuation.content')" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4" data-tour="screener-score-ranges">
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
            {{ $t('screener.filters.compositeRange') }}
            <InfoHelper :title="$t('screener.help.compositeScore.title')" :content="$t('screener.help.compositeScore.content')" />
          </label>
          <div class="flex gap-2">
            <UInput v-model.number="compositeScoreMin" type="number" :min="0" :max="100" placeholder="Min" size="sm" class="w-20" @update:model-value="page = 1" />
            <span class="text-gray-400 self-center">-</span>
            <UInput v-model.number="compositeScoreMax" type="number" :min="0" :max="100" placeholder="Max" size="sm" class="w-20" @update:model-value="page = 1" />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
            {{ $t('screener.filters.fundamentalRange') }}
            <InfoHelper :title="$t('screener.help.fundamentalScore.title')" :content="$t('screener.help.fundamentalScore.content')" />
          </label>
          <div class="flex gap-2">
            <UInput v-model.number="fundamentalScoreMin" type="number" :min="0" :max="100" placeholder="Min" size="sm" class="w-20" @update:model-value="page = 1" />
            <span class="text-gray-400 self-center">-</span>
            <UInput v-model.number="fundamentalScoreMax" type="number" :min="0" :max="100" placeholder="Max" size="sm" class="w-20" @update:model-value="page = 1" />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
            {{ $t('screener.filters.technicalRange') }}
            <InfoHelper :title="$t('screener.help.technicalScore.title')" :content="$t('screener.help.technicalScore.content')" />
          </label>
          <div class="flex gap-2">
            <UInput v-model.number="technicalScoreMin" type="number" :min="0" :max="100" placeholder="Min" size="sm" class="w-20" @update:model-value="page = 1" />
            <span class="text-gray-400 self-center">-</span>
            <UInput v-model.number="technicalScoreMax" type="number" :min="0" :max="100" placeholder="Max" size="sm" class="w-20" @update:model-value="page = 1" />
          </div>
        </div>
      </div>

      <button
        class="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 mb-3"
        data-tour="screener-advanced"
        @click="showAdvanced = !showAdvanced"
      >
        <UIcon name="i-lucide-sliders-horizontal" />
        {{ $t('screener.filters.advanced') }}
        <UIcon :name="showAdvanced ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />
      </button>

      <div v-if="showAdvanced" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
            {{ $t('screener.filters.piotroskiMin') }}
            <InfoHelper :title="$t('screener.help.piotroski.title')" :content="$t('screener.help.piotroski.content')" />
          </label>
          <UInput v-model.number="piotroskiScoreMin" type="number" :min="0" :max="9" placeholder="0-9" size="sm" class="w-24" @update:model-value="page = 1" />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
            {{ $t('screener.filters.marginOfSafetyRange') }}
            <InfoHelper :title="$t('screener.help.marginOfSafety.title')" :content="$t('screener.help.marginOfSafety.content')" />
          </label>
          <div class="flex gap-2">
            <UInput v-model.number="marginOfSafetyMin" type="number" step="1" placeholder="Min %" size="sm" class="w-24" @update:model-value="page = 1" />
            <span class="text-gray-400 self-center">-</span>
            <UInput v-model.number="marginOfSafetyMax" type="number" step="1" placeholder="Max %" size="sm" class="w-24" @update:model-value="page = 1" />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
            {{ $t('screener.filters.dataCompletenessMin') }}
            <InfoHelper :title="$t('screener.help.dataCompleteness.title')" :content="$t('screener.help.dataCompleteness.content')" />
          </label>
          <UInput v-model.number="dataCompletenessMin" type="number" :min="0" :max="100" placeholder="Min %" size="sm" class="w-24" @update:model-value="page = 1" />
        </div>
      </div>
    </UCard>

    <div class="flex items-center justify-between mb-4" data-tour="screener-sort">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ $t('screener.results.found', { count: total }) }}
      </span>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{{ $t('screener.sort.label') }}:</span>
        <USelect
          :model-value="sort"
          :items="sortItems"
          size="sm"
          class="w-44"
          @update:model-value="onSortChange"
        />
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          :icon="order === 'desc' ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide'"
          @click="toggleOrder"
        />
      </div>
    </div>

    <div class="flex gap-3 mb-4 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
      <UIcon name="i-lucide-alert-triangle" class="text-amber-500 text-base shrink-0 mt-0.5" />
      <p class="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
        {{ t('disclaimer.short') }}
      </p>
    </div>

    <div v-if="status === 'pending'" class="text-center py-8">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
      <p class="mt-2 text-gray-500 dark:text-gray-400">{{ $t('common.loading') }}</p>
    </div>

    <div v-else-if="stocks.length === 0" class="text-center py-12">
      <UIcon name="i-lucide-search-x" class="text-4xl text-gray-300 dark:text-gray-600" />
      <p class="mt-3 text-gray-500 dark:text-gray-400">{{ $t('screener.results.noResults') }}</p>
    </div>

    <div v-else class="space-y-2" data-tour="screener-results">
      <NuxtLink
        v-for="(stock, i) in stocks"
        :key="stock.symbol"
        :to="`/company/${stock.symbol}`"
        class="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all px-4 py-3"
      >
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400 dark:text-gray-500 font-mono w-7 text-right shrink-0">#{{ (page - 1) * 50 + i + 1 }}</span>
            <span class="font-medium text-gray-900 dark:text-gray-100 truncate">{{ stock.name }}</span>
            <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">({{ stock.symbol }})</span>
            <UBadge
              v-if="stock.stockCategory && categoryColors[stock.stockCategory]"
              :color="categoryColors[stock.stockCategory] as any"
              variant="subtle"
              size="xs"
              class="shrink-0"
            >
              {{ $t(`categories.${stock.stockCategory}`) }}
            </UBadge>
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap ml-auto shrink-0">
              {{ formatPrice(stock.currentPrice) }}
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 pl-9">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1">
                <span class="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{{ $t('stocks.columns.composite') }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{{ $t('stocks.columns.compositeShort') }}</span>
                <ScoreBadge :score="stock.compositeScore" :low-confidence="stock.dataCompleteness != null && stock.dataCompleteness < 40" />
              </div>
              <div class="flex items-center gap-1">
                <span class="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{{ $t('stocks.columns.fundamentals') }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{{ $t('stocks.columns.fundamentalsShort') }}</span>
                <ScoreBadge :score="stock.fundamentalScore" :low-confidence="stock.dataCompleteness != null && stock.dataCompleteness < 40" />
              </div>
              <div class="flex items-center gap-1">
                <span class="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{{ $t('stocks.columns.technical') }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{{ $t('stocks.columns.technicalShort') }}</span>
                <ScoreBadge :score="stock.technicalScore" />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <SignalBadge :signal="stock.overallSignal" />
              <ValuationBadge :signal="stock.valuationSignal" />
            </div>

            <div class="flex items-center gap-3 text-xs">
              <span :class="mosColor(stock.marginOfSafety)">
                MoS: {{ formatPercent(stock.marginOfSafety) }}
              </span>
              <span v-if="stock.piotroskiScore != null">
                <UBadge :color="piotroskiColor(stock.piotroskiScore) as any" variant="subtle" size="xs">
                  F: {{ stock.piotroskiScore }}/9
                </UBadge>
              </span>
              <span class="text-gray-600 dark:text-gray-400">P/E: {{ formatNumber(stock.pe) }}</span>
              <span class="text-gray-600 dark:text-gray-400">ROE: {{ formatPercent(stock.roe) }}</span>
            </div>

            <span class="text-xs text-gray-500 dark:text-gray-500 ml-auto truncate max-w-[180px]">{{ stock.sector ?? '-' }}</span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-if="totalPages > 1" class="flex justify-between items-center mt-4">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ $t('stocks.showing', { from: (page - 1) * 50 + 1, to: Math.min(page * 50, total), total }) }}
      </span>
      <div class="flex gap-2">
        <UButton :disabled="page <= 1" variant="outline" size="sm" @click="page--">
          {{ $t('common.previous') }}
        </UButton>
        <UButton :disabled="page >= totalPages" variant="outline" size="sm" @click="page++">
          {{ $t('common.next') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
