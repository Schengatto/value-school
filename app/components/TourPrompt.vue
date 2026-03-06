<script setup lang="ts">
defineProps<{
  show: boolean
  dontAskAgain: boolean
}>()

const emit = defineEmits<{
  start: []
  dismiss: []
  'update:dontAskAgain': [value: boolean]
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed bottom-6 right-6 z-100 flex items-end gap-3"
      >
        <div class="sage-speech-bubble relative max-w-64 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-4" style="--speech-bg: white">
          <p class="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">
            {{ $t('tour.prompt.sageQuip') }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">{{ $t('tour.prompt.description') }}</p>
          <div class="flex items-center gap-2 mb-3">
            <UButton size="xs" color="primary" @click="emit('start')">{{ $t('tour.prompt.start') }}</UButton>
            <UButton size="xs" variant="ghost" @click="emit('dismiss')">{{ $t('tour.prompt.dismiss') }}</UButton>
          </div>
          <label class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              :checked="dontAskAgain"
              class="rounded border-gray-300 dark:border-gray-600 text-primary-500"
              @change="emit('update:dontAskAgain', ($event.target as HTMLInputElement).checked)"
            >
            {{ $t('tour.prompt.dontAskAgain') }}
          </label>
          <div class="sage-speech-tail dark:border-l-gray-800!" />
        </div>

        <div class="sage-prompt-enter shrink-0">
          <SageMascot state="talking" :size="72" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
