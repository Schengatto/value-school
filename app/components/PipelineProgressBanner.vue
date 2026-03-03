<script setup lang="ts">
const { t } = useI18n()
const { state } = usePipelineProgress()

const isComplete = computed(() => state.value.status === 'completed')
const showBanner = computed(() => state.value.isRunning || isComplete.value)

const statusText = computed(() => {
  if (!state.value.isRunning && !isComplete.value) return ''
  if (isComplete.value) return t('pipeline.completed')
  if (state.value.processedTickers === 0) return t('pipeline.starting')
  return t('pipeline.processing', {
    current: state.value.processedTickers,
    total: state.value.totalTickers,
    symbol: state.value.currentSymbol ?? '...'
  })
})

const dismissed = ref(false)
watch(isComplete, (val) => {
  if (val) {
    setTimeout(() => { dismissed.value = true }, 10000)
  } else {
    dismissed.value = false
  }
})
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="showBanner && !dismissed"
      class="border-b"
      :class="isComplete
        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/50'
        : 'border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/50'"
    >
      <div class="max-w-7xl mx-auto px-4 py-2.5">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2 text-sm">
            <UIcon
              :name="isComplete ? 'i-lucide-check-circle' : 'i-lucide-loader-2'"
              :class="isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'animate-spin text-blue-600 dark:text-blue-400'"
            />
            <span
              class="font-medium"
              :class="isComplete ? 'text-emerald-800 dark:text-emerald-200' : 'text-blue-800 dark:text-blue-200'"
            >
              {{ isComplete ? t('pipeline.completed') : t('pipeline.running') }}
            </span>
            <span
              v-if="!isComplete"
              :class="isComplete ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300'"
              class="text-xs sm:text-sm"
            >
              {{ statusText }}
            </span>
          </div>
          <div class="flex items-center gap-3 text-xs" :class="isComplete ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300'">
            <span>{{ t('pipeline.success') }}: {{ state.successCount }}</span>
            <span v-if="state.errorCount > 0" class="text-red-600 dark:text-red-400">
              {{ t('pipeline.errors') }}: {{ state.errorCount }}
            </span>
            <span class="font-semibold">{{ state.progressPercent }}%</span>
          </div>
        </div>
        <UProgress
          :model-value="state.progressPercent"
          :max="100"
          :color="isComplete ? 'success' : 'info'"
          size="xs"
        />
      </div>
    </div>
  </Transition>
</template>
