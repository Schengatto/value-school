<script setup lang="ts">
const props = defineProps<{
  reasons: {
    passed: string[]
    failed: string[]
    unavailable: string[]
  } | null
}>()
</script>

<template>
  <div v-if="reasons" class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <h4 class="text-sm font-semibold text-green-600 mb-2">
        {{ $t('fundamentals.passed', { count: reasons.passed?.length ?? 0 }) }}
      </h4>
      <ul class="space-y-1">
        <li v-for="r in reasons.passed" :key="r" class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
          <UIcon name="i-lucide-check-circle" class="text-green-500 mt-0.5 shrink-0" />
          {{ r }}
        </li>
      </ul>
    </div>

    <div>
      <h4 class="text-sm font-semibold text-red-600 mb-2">
        {{ $t('fundamentals.failed', { count: reasons.failed?.length ?? 0 }) }}
      </h4>
      <ul class="space-y-1">
        <li v-for="r in reasons.failed" :key="r" class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
          <UIcon name="i-lucide-x-circle" class="text-red-500 mt-0.5 shrink-0" />
          {{ r }}
        </li>
      </ul>

      <h4 v-if="reasons.unavailable?.length" class="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-4 mb-2">
        {{ $t('fundamentals.unavailable', { count: reasons.unavailable.length }) }}
      </h4>
      <ul v-if="reasons.unavailable?.length" class="space-y-1">
        <li v-for="r in reasons.unavailable" :key="r" class="flex items-start gap-2 text-sm text-gray-400 dark:text-gray-500">
          <UIcon name="i-lucide-minus-circle" class="mt-0.5 shrink-0" />
          {{ r }}
        </li>
      </ul>
    </div>
  </div>
</template>
