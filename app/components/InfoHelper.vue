<script setup lang="ts">
defineProps<{
  title: string
  content: string
}>()
</script>

<template>
  <UPopover :ui="{ content: 'max-w-xs sm:max-w-sm' }">
    <button
      type="button"
      class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-800/50 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      aria-label="Info"
    >
      <UIcon name="i-lucide-help-circle" class="text-sm" />
    </button>
    <template #content>
      <div class="p-3">
        <p class="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1.5">{{ title }}</p>
        <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{{ content }}</p>
      </div>
    </template>
  </UPopover>
</template>
