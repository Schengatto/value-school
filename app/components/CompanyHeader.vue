<script setup lang="ts">
const config = useRuntimeConfig()
const externalNewsUrl = computed(() => config.public.externalNewsUrl as string)

const props = defineProps<{
  symbol: string
  name: string
  currentPrice: number | null
  companySummary: Record<string, any> | null
  fundamentalScore: number | null
  technicalScore: number | null
  compositeScore: number | null
  overallSignal: string | null
  assetProfile: Record<string, any> | null
  dataCompleteness: number | null
}>()

const lowConfidence = computed(() => props.dataCompleteness != null && props.dataCompleteness < 40)

function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-'
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
  return `$${value.toLocaleString()}`
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {{ name }}
        <span class="text-gray-400 dark:text-gray-500 text-lg font-normal">({{ symbol }})</span>
      </h1>
      <SignalBadge :signal="overallSignal" />
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <UBadge v-if="companySummary?.sector" color="neutral" variant="outline" size="sm">
        {{ companySummary.sector }}
      </UBadge>
      <UBadge v-if="companySummary?.industry" color="neutral" variant="outline" size="sm">
        {{ companySummary.industry }}
      </UBadge>
      <UBadge v-if="assetProfile?.country" color="neutral" variant="outline" size="sm">
        {{ assetProfile.country }}
      </UBadge>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.price') }}</p>
        <p class="text-lg font-bold text-gray-900 dark:text-gray-100">${{ currentPrice?.toFixed(2) ?? '-' }}</p>
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.marketCap') }}</p>
        <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ formatCurrency(companySummary?.marketcap) }}</p>
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.fundamental') }}</p>
        <p class="text-lg font-bold"><ScoreBadge :score="fundamentalScore" :low-confidence="lowConfidence" /></p>
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.technicalLabel') }}</p>
        <p class="text-lg font-bold"><ScoreBadge :score="technicalScore" /></p>
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.compositeLabel') }}</p>
        <p class="text-lg font-bold"><ScoreBadge :score="compositeScore" :low-confidence="lowConfidence" /></p>
      </div>
    </div>

    <div class="flex gap-2 mt-3">
      <UButton
        :to="`https://finance.yahoo.com/quote/${symbol}`"
        target="_blank"
        variant="ghost"
        size="xs"
        color="neutral"
      >
        {{ $t('company.yahooFinance') }}
      </UButton>
      <UButton
        :to="`https://www.tradingview.com/symbols/${symbol}`"
        target="_blank"
        variant="ghost"
        size="xs"
        color="neutral"
      >
        {{ $t('company.tradingView') }}
      </UButton>
      <UButton
        v-if="externalNewsUrl"
        :to="`${externalNewsUrl}?q=${encodeURIComponent(name)}`"
        target="_blank"
        variant="ghost"
        size="xs"
        color="neutral"
        icon="i-lucide-newspaper"
      >
        {{ $t('company.gazetteMarket') }}
      </UButton>
      <UButton
        v-if="assetProfile?.website"
        :to="assetProfile.website"
        target="_blank"
        variant="ghost"
        size="xs"
        color="neutral"
      >
        {{ $t('company.website') }}
      </UButton>
    </div>
  </div>
</template>
