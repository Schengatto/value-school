<script setup lang="ts">
const route = useRoute()
const symbol = (route.params.symbol as string).toUpperCase()
const { t } = useI18n()

useHead({ title: t('quiz.page.title', { symbol }) })

const { data: stock, status } = useCompany(symbol)

const {
  questionsForSection,
  answers,
  answerQuestion,
  progress,
  resetQuiz
} = useAnalysisQuiz(symbol, computed(() => stock.value ?? null))

const sectionKeys = ['financials', 'valuation', 'technical', 'management'] as const

const sectionQuestions = computed(() =>
  sectionKeys.map(key => ({
    key,
    label: t(`quiz.page.sections.${key}`),
    questions: questionsForSection(key).value
  })).filter(s => s.questions.length > 0)
)

const currentStep = ref(0)
const showResults = ref(false)

const currentSection = computed(() => sectionQuestions.value[currentStep.value])
const totalSteps = computed(() => sectionQuestions.value.length)

function nextStep() {
  if (currentStep.value < totalSteps.value - 1) {
    currentStep.value++
  } else {
    showResults.value = true
  }
}

function prevStep() {
  if (showResults.value) {
    showResults.value = false
  } else if (currentStep.value > 0) {
    currentStep.value--
  }
}

function restart() {
  resetQuiz()
  currentStep.value = 0
  showResults.value = false
}

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
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <NuxtLink :to="`/company/${symbol}`" class="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
      <UIcon name="i-lucide-arrow-left" />
      {{ $t('quiz.page.backToAnalysis') }}
    </NuxtLink>

    <div v-if="status === 'pending'" class="text-center py-20">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl" />
    </div>

    <template v-else-if="stock && sectionQuestions.length > 0">
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <h1 class="text-xl font-bold">{{ $t('quiz.page.title', { symbol }) }}</h1>
          <UBadge v-if="progress.answered > 0" color="primary" variant="subtle">
            {{ progress.correct }}/{{ progress.total }}
          </UBadge>
        </div>
        <div class="flex gap-1">
          <div
            v-for="(s, i) in sectionQuestions"
            :key="s.key"
            class="h-1.5 flex-1 rounded-full transition-colors"
            :class="showResults || i < currentStep ? 'bg-blue-500' : i === currentStep ? 'bg-blue-300 dark:bg-blue-700' : 'bg-gray-200 dark:bg-gray-700'"
          />
        </div>
      </div>

      <template v-if="showResults">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-trophy" class="text-yellow-500" />
              <h2 class="font-semibold text-lg">{{ $t('quiz.page.results') }}</h2>
            </div>
          </template>

          <div class="text-center py-6">
            <div class="text-5xl font-bold mb-2" :class="progress.correct >= progress.total * 0.7 ? 'text-green-600' : progress.correct >= progress.total * 0.4 ? 'text-yellow-500' : 'text-red-500'">
              {{ progress.correct }}/{{ progress.total }}
            </div>
            <p class="text-gray-500 dark:text-gray-400">{{ $t('quiz.page.score', { correct: progress.correct, total: progress.total }) }}</p>
          </div>

          <div class="space-y-2 mt-4">
            <div
              v-for="section in sectionQuestions"
              :key="section.key"
              class="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <span class="text-sm font-medium">{{ section.label }}</span>
              <span class="text-sm">
                {{ section.questions.filter(q => answers[q.id]?.correct).length }}/{{ section.questions.length }}
              </span>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <UButton variant="soft" @click="restart">
              <UIcon name="i-lucide-rotate-ccw" />
              {{ $t('quiz.page.restart') }}
            </UButton>
            <NuxtLink :to="`/company/${symbol}`">
              <UButton color="primary">
                {{ $t('quiz.page.backToCompany', { symbol }) }}
              </UButton>
            </NuxtLink>
          </div>
        </UCard>
      </template>

      <template v-else-if="currentSection">
        <UCard class="mb-4">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-brain" class="text-blue-500" />
                {{ currentSection.label }}
              </h2>
              <span class="text-xs text-gray-400">{{ $t('quiz.page.step', { current: currentStep + 1, total: totalSteps }) }}</span>
            </div>
          </template>

          <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <template v-if="currentSection.key === 'financials'">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.revenue') }}</p>
                  <p class="font-semibold">{{ formatNumber(stock.revenue) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.freeCashFlow') }}</p>
                  <p class="font-semibold">{{ formatNumber(stock.freeCashFlow) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.currentRatio') }}</p>
                  <p class="font-semibold">{{ formatRatio(stock.currentRatio) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.debtToEbitda') }}</p>
                  <p class="font-semibold">{{ formatRatio(stock.debtToEbitda) }}</p>
                </div>
              </div>
            </template>

            <template v-else-if="currentSection.key === 'valuation'">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.peRatio') }}</p>
                  <p class="font-semibold">{{ formatRatio(stock.pe) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.fairValueLabel') }}</p>
                  <p class="font-semibold">{{ formatPrice(stock.fairValue) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.currentPriceLabel') }}</p>
                  <p class="font-semibold">{{ formatPrice(stock.currentPrice) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.marginOfSafety') }}</p>
                  <p class="font-semibold" :class="(stock.marginOfSafety ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'">
                    {{ stock.marginOfSafety != null ? `${stock.marginOfSafety > 0 ? '+' : ''}${stock.marginOfSafety.toFixed(1)}%` : '-' }}
                  </p>
                </div>
              </div>
            </template>

            <template v-else-if="currentSection.key === 'technical'">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.rsi') }}</p>
                  <p class="font-semibold">{{ formatRatio((stock.technicalData as any)?.rsi14) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.sma50') }}</p>
                  <p class="font-semibold">${{ formatRatio((stock.technicalData as any)?.sma50) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.sma200') }}</p>
                  <p class="font-semibold">${{ formatRatio((stock.technicalData as any)?.sma200) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.macd') }}</p>
                  <p class="font-semibold">{{ formatRatio((stock.technicalData as any)?.macd?.histogram) }}</p>
                </div>
              </div>
            </template>

            <template v-else-if="currentSection.key === 'management'">
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.piotroskiTitle') }}</p>
                  <p class="font-semibold">{{ stock.piotroskiScore ?? '-' }}<span class="text-gray-400">/9</span></p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.earningsQualityTitle') }}</p>
                  <p class="font-semibold">{{ stock.earningsQuality != null ? stock.earningsQuality.toFixed(2) : '-' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ $t('company.shareDilutionTitle') }}</p>
                  <p class="font-semibold">{{ stock.shareDilution != null ? `${(stock.shareDilution * 100).toFixed(1)}%` : '-' }}</p>
                </div>
              </div>
            </template>
          </div>

          <div class="space-y-4">
            <div v-for="q in currentSection.questions" :key="q.id" class="border border-gray-100 dark:border-gray-800 rounded-lg p-3">
              <p class="text-sm font-medium mb-2">{{ q.question }}</p>
              <div class="space-y-1.5">
                <button
                  v-for="opt in q.options"
                  :key="opt.key"
                  class="w-full text-left text-sm px-3 py-2 rounded-md transition-colors flex items-center gap-2"
                  :class="[
                    !answers[q.id] ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' : 'cursor-default',
                    answers[q.id]?.selected === opt.key && answers[q.id]?.correct ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400' : '',
                    answers[q.id]?.selected === opt.key && !answers[q.id]?.correct ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : '',
                    answers[q.id] && opt.key === q.correctKey && answers[q.id]?.selected !== opt.key ? 'bg-green-50/50 dark:bg-green-950/20 text-green-600 dark:text-green-500' : ''
                  ]"
                  :disabled="!!answers[q.id]"
                  @click="answerQuestion(q.id, opt.key)"
                >
                  <span
                    class="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-xs"
                    :class="[
                      !answers[q.id] ? 'border-gray-300 dark:border-gray-600' : '',
                      answers[q.id]?.selected === opt.key && answers[q.id]?.correct ? 'border-green-500 bg-green-500 text-white' : '',
                      answers[q.id]?.selected === opt.key && !answers[q.id]?.correct ? 'border-red-500 bg-red-500 text-white' : '',
                      answers[q.id] && opt.key === q.correctKey && answers[q.id]?.selected !== opt.key ? 'border-green-500 bg-green-100 dark:bg-green-900' : ''
                    ]"
                  >
                    <UIcon v-if="answers[q.id]?.selected === opt.key && answers[q.id]?.correct" name="i-lucide-check" />
                    <UIcon v-else-if="answers[q.id]?.selected === opt.key && !answers[q.id]?.correct" name="i-lucide-x" />
                  </span>
                  {{ opt.label }}
                </button>
              </div>
              <p v-if="answers[q.id]" class="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2">
                {{ q.explanation }}
              </p>
            </div>
          </div>
        </UCard>

        <div class="flex justify-between">
          <UButton
            v-if="currentStep > 0"
            variant="ghost"
            @click="prevStep"
          >
            <UIcon name="i-lucide-arrow-left" />
            {{ $t('quiz.page.previous') }}
          </UButton>
          <div v-else />
          <UButton
            color="primary"
            @click="nextStep"
          >
            {{ currentStep < totalSteps - 1 ? $t('quiz.page.next') : $t('quiz.page.finish') }}
            <UIcon name="i-lucide-arrow-right" />
          </UButton>
        </div>
      </template>
    </template>
  </div>
</template>
