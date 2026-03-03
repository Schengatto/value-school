<script setup lang="ts">
defineProps<{
  term: string
}>()
</script>

<template>
  <UPopover :ui="{ content: 'max-w-xs sm:max-w-sm' }">
    <span
      class="text-xs text-gray-500 dark:text-gray-400 underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 underline-offset-2 cursor-help hover:text-blue-600 dark:hover:text-blue-400 hover:decoration-blue-400 dark:hover:decoration-blue-400 transition-colors"
    >
      {{ $t(`glossary.${term}.label`) }}
    </span>
    <template #content>
      <div class="p-3">
        <p class="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1.5">
          {{ $t(`glossary.${term}.title`) }}
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
          {{ $t(`glossary.${term}.definition`) }}
        </p>
        <div class="bg-gray-50 dark:bg-gray-800 rounded-md px-2.5 py-2">
          <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">
            {{ $t(`glossary.${term}.example`) }}
          </p>
        </div>
      </div>
    </template>
  </UPopover>
</template>
