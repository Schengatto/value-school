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
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="show"
        class="fixed top-16 right-4 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-[100]"
      >
        <p class="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">{{ $t('tour.prompt.title') }}</p>
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
      </div>
    </Transition>
  </Teleport>
</template>
