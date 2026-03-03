<script setup lang="ts">
const route = useRoute()
const symbol = (route.params.symbol as string).toUpperCase()
const { t } = useI18n()

useHead({ title: `${symbol} - Stocks Radar` })

const { data: stock, status } = useCompany(symbol)

function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-'
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-'
  return `${(value * 100).toFixed(1)}%`
}

function formatRatio(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-'
  return value.toFixed(2)
}

function formatPrice(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-'
  return `$${value.toFixed(2)}`
}

const fairValue = computed(() => (stock.value?.fairValueData as any) ?? null)

const valuationColor = computed(() => {
  const signal = stock.value?.valuationSignal
  if (signal === 'undervalued') return 'success'
  if (signal === 'overvalued') return 'error'
  if (signal === 'fairly_valued') return 'info'
  return 'neutral'
})

const valuationLabel = computed(() => {
  const signal = stock.value?.valuationSignal
  if (signal === 'undervalued') return t('company.undervalued')
  if (signal === 'overvalued') return t('company.overvalued')
  if (signal === 'fairly_valued') return t('company.fairlyValued')
  return 'N/A'
})

const consensusLabel = computed(() => {
  const c = fairValue.value?.analystConsensus
  if (!c) return null
  const total = c.strongBuy + c.buy + c.hold + c.sell + c.strongSell
  if (total === 0) return null
  const score = (c.strongBuy * 5 + c.buy * 4 + c.hold * 3 + c.sell * 2 + c.strongSell * 1) / total
  if (score >= 4) return { label: t('company.strongBuy'), color: 'success' }
  if (score >= 3.5) return { label: t('company.buy'), color: 'success' }
  if (score >= 2.5) return { label: t('company.hold'), color: 'warning' }
  if (score >= 1.5) return { label: t('company.sell'), color: 'error' }
  return { label: t('company.strongSell'), color: 'error' }
})

const sections = computed(() => [
  { id: 'overview', label: t('company.sections.overview') },
  { id: 'financials', label: t('company.sections.financials') },
  { id: 'valuation', label: t('company.sections.valuation') },
  { id: 'technical', label: t('company.sections.technical') },
  { id: 'management', label: t('company.sections.management') },
  { id: 'governance', label: t('company.sections.governance') }
])

const { startTour } = useTour()
const { showPrompt, dontAskAgain, dismissPrompt, startAndDismiss } = useTourPrompt()

const { progress: quizProgress } = useAnalysisQuiz(symbol, computed(() => stock.value ?? null))

const piotroskiDetails = computed(() => (stock.value?.piotroskiDetails as any) ?? null)
</script>

<template>
  <div>
    <NuxtLink to="/" class="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
      <UIcon name="i-lucide-arrow-left" />
      {{ $t('company.backToRankings') }}
    </NuxtLink>

    <div v-if="status === 'pending'" class="text-center py-20">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl" />
      <p class="mt-3 text-gray-500 dark:text-gray-400">{{ $t('company.loading', { symbol }) }}</p>
    </div>

    <UCard v-else-if="!stock" class="text-center py-10">
      <p class="text-lg text-gray-500 dark:text-gray-400">{{ $t('company.notFound', { symbol }) }}</p>
      <NuxtLink to="/" class="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">{{ $t('company.returnHome') }}</NuxtLink>
    </UCard>

    <div v-else>
      <UCard class="mb-6">
        <CompanyHeader
          :symbol="stock.symbol"
          :name="stock.name"
          :current-price="stock.currentPrice"
          :company-summary="stock.companySummary as any"
          :fundamental-score="stock.fundamentalScore"
          :technical-score="stock.technicalScore"
          :composite-score="stock.compositeScore"
          :overall-signal="stock.overallSignal"
          :asset-profile="stock.assetProfile as any"
          :data-completeness="stock.dataCompleteness"
        />
      </UCard>

      <div class="sticky top-0 z-10 mb-6">
        <nav class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rounded-lg">
          <div class="flex items-center gap-4 overflow-x-auto py-2 px-4">
            <a
              v-for="s in sections"
              :key="s.id"
              :href="`#${s.id}`"
              class="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 whitespace-nowrap py-1 border-b-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400"
            >
              {{ s.label }}
            </a>
            <div class="ml-auto shrink-0 flex items-center gap-2">
              <UBadge v-if="quizProgress.answered > 0" color="primary" variant="subtle" size="xs">
                {{ quizProgress.answered }}/{{ quizProgress.total }}
              </UBadge>
              <UButton
                icon="i-lucide-circle-help"
                variant="ghost"
                size="xs"
                :label="$t('tour.startTour')"
                @click="startTour"
              />
            </div>
          </div>
        </nav>
        <TourPrompt
          :show="showPrompt"
          :dont-ask-again="dontAskAgain"
          @start="startAndDismiss(startTour)"
          @dismiss="dismissPrompt"
          @update:dont-ask-again="dontAskAgain = $event"
        />
      </div>

      <section id="overview" class="mb-6" data-tour="overview">
        <UCard>
          <template #header>
            <h3 class="font-semibold">{{ $t('company.sections.overview') }}</h3>
          </template>
          <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {{ (stock.companySummary as any)?.longBusinessSummary ?? $t('company.noDescription') }}
          </p>
        </UCard>
      </section>

      <section id="financials" class="mb-6 space-y-4">
        <div
          v-if="stock.dataCompleteness != null && stock.dataCompleteness < 40"
          class="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
        >
          <UIcon name="i-lucide-triangle-alert" class="text-amber-500 shrink-0 mt-0.5" />
          <p class="text-sm text-amber-800 dark:text-amber-200">
            {{ $t('company.lowDataWarning', { percent: stock.dataCompleteness }) }}
          </p>
        </div>

        <UCard data-tour="balance-sheet">
          <template #header>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold">{{ $t('company.balanceSheet') }}</h3>
              <InfoHelper :title="$t('helpers.balanceSheet.title')" :content="$t('helpers.balanceSheet.content')" />
            </div>
          </template>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div data-tour="metric-revenue">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.revenue') }}</p>
              <p class="font-semibold">{{ formatNumber(stock.revenue) }}</p>
            </div>
            <div data-tour="metric-net-income">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.netIncome') }}</p>
              <p class="font-semibold">{{ formatNumber(stock.netIncome) }}</p>
            </div>
            <div data-tour="metric-fcf">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.freeCashFlow') }}</p>
              <p class="font-semibold">{{ formatNumber(stock.freeCashFlow) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.totalEquity') }}</p>
              <p class="font-semibold">{{ formatNumber(stock.totalEquity) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.totalLiabilities') }}</p>
              <p class="font-semibold">{{ formatNumber(stock.totalLiabilities) }}</p>
            </div>
            <div data-tour="metric-current-ratio">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.currentRatio') }}</p>
              <p class="font-semibold">{{ formatRatio(stock.currentRatio) }}</p>
            </div>
            <div data-tour="metric-interest-coverage">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.interestCoverage') }}</p>
              <p class="font-semibold">{{ formatRatio(stock.interestCoverage) }}</p>
            </div>
            <div data-tour="metric-debt-ebitda">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.debtToEbitda') }}</p>
              <p class="font-semibold">{{ formatRatio(stock.debtToEbitda) }}</p>
            </div>
          </div>
        </UCard>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UCard data-tour="eps-chart">
            <template #header>
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-sm">{{ $t('company.epsTitle') }}</h3>
                <InfoHelper :title="$t('helpers.epsChart.title')" :content="$t('helpers.epsChart.content')" />
              </div>
            </template>
            <ClientOnly>
              <EpsChart :eps-history="stock.epsHistory as any" />
            </ClientOnly>
          </UCard>
          <UCard data-tour="revenue-chart">
            <template #header>
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-sm">{{ $t('company.revenueNetIncomeTitle') }}</h3>
                <InfoHelper :title="$t('helpers.revenueChart.title')" :content="$t('helpers.revenueChart.content')" />
              </div>
            </template>
            <ClientOnly>
              <RevenueNetIncomeChart :fmp-data="stock.fmpData as any" />
            </ClientOnly>
          </UCard>
        </div>

        <UCard data-tour="fcf-chart">
          <template #header>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-sm">{{ $t('company.fcfTitle') }}</h3>
              <InfoHelper :title="$t('helpers.fcfChart.title')" :content="$t('helpers.fcfChart.content')" />
            </div>
          </template>
          <ClientOnly>
            <FcfChart :fmp-data="stock.fmpData as any" />
          </ClientOnly>
        </UCard>

        <UCard data-tour="income-breakdown">
          <template #header>
            <h3 class="font-semibold text-sm">{{ $t('company.incomeBreakdownTitle') }}</h3>
          </template>
          <ClientOnly>
            <IncomeBreakdownChart :fmp-data="stock.fmpData as any" />
          </ClientOnly>
        </UCard>

      </section>

      <section id="valuation" class="mb-6 space-y-4">
        <UCard v-if="stock.fairValue" data-tour="fair-value">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-target" class="text-blue-600 dark:text-blue-400" />
                {{ $t('company.fairValueEstimation') }}
                <InfoHelper :title="$t('helpers.fairValue.title')" :content="$t('helpers.fairValue.content')" />
              </h3>
              <UBadge :color="valuationColor" variant="subtle">
                {{ valuationLabel }}
              </UBadge>
            </div>
          </template>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div data-tour="metric-fair-value">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.fairValueLabel') }}</p>
              <p class="text-lg font-bold text-blue-700 dark:text-blue-400">{{ formatPrice(stock.fairValue) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.currentPriceLabel') }}</p>
              <p class="text-lg font-semibold">{{ formatPrice(stock.currentPrice) }}</p>
            </div>
            <div data-tour="metric-margin-of-safety">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.marginOfSafety') }}</p>
              <p
                class="text-lg font-semibold"
                :class="(stock.marginOfSafety ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'"
              >
                {{ stock.marginOfSafety != null ? `${stock.marginOfSafety > 0 ? '+' : ''}${stock.marginOfSafety.toFixed(1)}%` : '-' }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.fairValueRange') }}</p>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ formatPrice(stock.fairValueLow) }} - {{ formatPrice(stock.fairValueHigh) }}
              </p>
            </div>
          </div>

          <div v-if="fairValue?.estimates?.length" class="mb-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">{{ $t('company.estimationMethods') }}</p>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="est in fairValue.estimates"
                :key="est.method"
                class="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs"
              >
                <span class="text-gray-500 dark:text-gray-400">{{ est.method }}:</span>
                <span class="font-medium ml-1" :class="est.value ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'">
                  {{ est.value ? formatPrice(est.value) : 'N/A' }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <InfoHelper :title="$t('helpers.analystConsensus.title')" :content="$t('helpers.analystConsensus.content')" />
            <template v-if="fairValue?.analystConsensus">
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.analystConsensusLabel') }}:</span>
                <UBadge v-if="consensusLabel" :color="consensusLabel.color as any" variant="subtle" size="xs">
                  {{ consensusLabel.label }}
                </UBadge>
                <span class="text-xs text-gray-400 dark:text-gray-500">
                  ({{ fairValue.analystConsensus.strongBuy + fairValue.analystConsensus.buy }}B /
                  {{ fairValue.analystConsensus.hold }}H /
                  {{ fairValue.analystConsensus.sell + fairValue.analystConsensus.strongSell }}S)
                </span>
              </div>
            </template>
            <template v-if="fairValue?.latestEarningsSurprise != null">
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.lastEarningsSurprise') }}:</span>
                <span
                  class="text-xs font-medium"
                  :class="fairValue.latestEarningsSurprise >= 0 ? 'text-green-600' : 'text-red-500'"
                >
                  {{ fairValue.latestEarningsSurprise >= 0 ? '+' : '' }}{{ fairValue.latestEarningsSurprise.toFixed(2) }}%
                </span>
              </div>
            </template>
          </div>
        </UCard>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UCard data-tour="valuation-metrics">
            <template #header>
              <div class="flex items-center gap-2">
                <h3 class="font-semibold">{{ $t('company.valuationMetrics') }}</h3>
                <InfoHelper :title="$t('helpers.valuationMetrics.title')" :content="$t('helpers.valuationMetrics.content')" />
              </div>
            </template>
            <div class="grid grid-cols-2 gap-3">
              <div data-tour="metric-pe">
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.peRatio') }}</p>
                <p class="font-semibold">{{ formatRatio(stock.pe) }}</p>
              </div>
              <div data-tour="metric-roe">
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.roe') }}</p>
                <p class="font-semibold">{{ formatPercent(stock.roe) }}</p>
              </div>
              <div data-tour="metric-pb">
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.pbRatio') }}</p>
                <p class="font-semibold">{{ formatRatio((stock.fmpData as any)?.metrics?.pbRatio) }}</p>
              </div>
              <div data-tour="metric-pfcf">
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.pfcf') }}</p>
                <p class="font-semibold">{{ formatRatio((stock.fmpData as any)?.metrics?.pfcfRatio) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.grossMargin') }}</p>
                <p class="font-semibold">{{ formatPercent((stock.fmpData as any)?.metrics?.grossProfitMargin) }}</p>
              </div>
              <div data-tour="metric-roic">
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.roic') }}</p>
                <p class="font-semibold">{{ formatPercent((stock.fmpData as any)?.metrics?.roic) }}</p>
              </div>
            </div>
          </UCard>

          <UCard data-tour="radar-chart">
            <ClientOnly>
              <RatiosRadarChart
                :fmp-data="stock.fmpData as any"
                :fundamental-score="stock.fundamentalScore"
                :technical-score="stock.technicalScore"
              />
            </ClientOnly>
          </UCard>
        </div>

        <UCard data-tour="fundamental-criteria">
          <template #header>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold">{{ $t('company.fundamentalCriteria') }}</h3>
              <InfoHelper :title="$t('helpers.fundamentalCriteria.title')" :content="$t('helpers.fundamentalCriteria.content')" />
            </div>
          </template>
          <FundamentalSignals :reasons="stock.fundamentalReasons as any" />
        </UCard>

      </section>

      <section id="technical" class="mb-6 space-y-4">
        <UCard data-tour="price-chart">
          <template #header>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-sm">{{ $t('company.priceChartTitle') }}</h3>
              <InfoHelper :title="$t('helpers.priceChart.title')" :content="$t('helpers.priceChart.content')" />
            </div>
          </template>
          <ClientOnly>
            <PriceChart :prices-daily="stock.pricesDaily as any" />
            <div class="mt-2 border-t border-gray-100 dark:border-gray-800 pt-2">
              <RsiChart :prices-daily="stock.pricesDaily as any" />
            </div>
          </ClientOnly>
        </UCard>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UCard data-tour="sma-chart">
            <ClientOnly>
              <TechnicalChart
                :prices-daily="stock.pricesDaily as any"
                :technical-data="stock.technicalData as any"
              />
            </ClientOnly>
          </UCard>

          <UCard data-tour="technical-indicators">
            <template #header>
              <div class="flex items-center gap-2">
                <h3 class="font-semibold">{{ $t('company.technicalIndicators') }}</h3>
                <InfoHelper :title="$t('helpers.technicalIndicators.title')" :content="$t('helpers.technicalIndicators.content')" />
              </div>
            </template>
            <div class="grid grid-cols-2 gap-3">
              <div data-tour="metric-rsi">
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.rsi') }}</p>
                <p class="font-semibold">{{ formatRatio((stock.technicalData as any)?.rsi14) }}</p>
              </div>
              <div data-tour="metric-sma50">
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.sma50') }}</p>
                <p class="font-semibold">${{ formatRatio((stock.technicalData as any)?.sma50) }}</p>
              </div>
              <div data-tour="metric-sma200">
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.sma200') }}</p>
                <p class="font-semibold">${{ formatRatio((stock.technicalData as any)?.sma200) }}</p>
              </div>
              <div data-tour="metric-macd">
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.macd') }}</p>
                <p class="font-semibold">{{ formatRatio((stock.technicalData as any)?.macd?.histogram) }}</p>
              </div>
              <div data-tour="metric-volatility">
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.volatility') }}</p>
                <p class="font-semibold">{{ formatPercent((stock.technicalData as any)?.volatility) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.momentum') }}</p>
                <p class="font-semibold">{{ formatPercent((stock.technicalData as any)?.roc12m) }}</p>
              </div>
            </div>
            <p class="mt-3 text-xs text-gray-500 dark:text-gray-400 italic">
              {{ (stock.technicalData as any)?.signalExplanation }}
            </p>
          </UCard>
        </div>

      </section>

      <section id="management" class="mb-6 space-y-4">
        <UCard data-tour="piotroski">
          <template #header>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold">{{ $t('company.piotroskiTitle') }}</h3>
            </div>
          </template>
          <div class="flex items-center gap-4 mb-3">
            <div class="text-3xl font-bold" :class="(stock.piotroskiScore ?? 0) >= 7 ? 'text-green-600' : (stock.piotroskiScore ?? 0) >= 4 ? 'text-yellow-500' : 'text-red-500'">
              {{ stock.piotroskiScore ?? '-' }}<span class="text-lg text-gray-400">/9</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ (stock.piotroskiScore ?? 0) >= 7 ? $t('company.piotroskiStrong') : (stock.piotroskiScore ?? 0) >= 4 ? $t('company.piotroskiMixed') : $t('company.piotroskiWeak') }}
            </p>
          </div>
          <div v-if="piotroskiDetails" class="grid grid-cols-3 gap-2">
            <div
              v-for="(passed, criterion) in piotroskiDetails"
              :key="criterion"
              class="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded"
              :class="passed ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'"
            >
              <UIcon :name="passed ? 'i-lucide-check' : 'i-lucide-x'" class="shrink-0" />
              <span class="truncate">{{ criterion }}</span>
            </div>
          </div>
        </UCard>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UCard data-tour="earnings-quality">
            <template #header>
              <h3 class="font-semibold">{{ $t('company.earningsQualityTitle') }}</h3>
            </template>
            <div class="flex items-center gap-4">
              <div class="text-3xl font-bold" :class="(stock.earningsQuality ?? 0) >= 1 ? 'text-green-600' : (stock.earningsQuality ?? 0) >= 0.5 ? 'text-yellow-500' : 'text-red-500'">
                {{ stock.earningsQuality != null ? stock.earningsQuality.toFixed(2) : '-' }}
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ (stock.earningsQuality ?? 0) >= 1 ? $t('company.earningsQualityHigh') : (stock.earningsQuality ?? 0) >= 0.5 ? $t('company.earningsQualityModerate') : $t('company.earningsQualityLow') }}
              </p>
            </div>
          </UCard>

          <UCard data-tour="share-dilution">
            <template #header>
              <h3 class="font-semibold">{{ $t('company.shareDilutionTitle') }}</h3>
            </template>
            <div class="flex items-center gap-4">
              <div class="text-3xl font-bold" :class="(stock.shareDilution ?? 0) <= 0 ? 'text-green-600' : (stock.shareDilution ?? 0) <= 0.02 ? 'text-yellow-500' : 'text-red-500'">
                {{ stock.shareDilution != null ? `${(stock.shareDilution * 100).toFixed(1)}%` : '-' }}
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ (stock.shareDilution ?? 0) <= 0 ? $t('company.shareDilutionBuyback') : (stock.shareDilution ?? 0) <= 0.02 ? $t('company.shareDilutionStable') : $t('company.shareDilutionDiluting') }}
              </p>
            </div>
          </UCard>
        </div>

      </section>

      <section id="governance" class="mb-6">
        <UCard data-tour="governance">
          <template #header>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold">{{ $t('company.governance') }}</h3>
              <InfoHelper :title="$t('helpers.governance.title')" :content="$t('helpers.governance.content')" />
            </div>
          </template>
          <GovernanceSection :asset-profile="stock.assetProfile as any" />
        </UCard>
      </section>

      <div class="mb-6 text-center">
        <NuxtLink :to="`/quiz/${symbol}`">
          <UButton icon="i-lucide-brain" variant="soft" color="primary">
            {{ $t('company.startQuiz') }}
            <UBadge v-if="quizProgress.answered > 0" color="primary" variant="subtle" size="xs" class="ml-2">
              {{ quizProgress.answered }}/{{ quizProgress.total }}
            </UBadge>
          </UButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
