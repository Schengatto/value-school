<script setup lang="ts">
const props = defineProps<{
  signal: string | null
}>()

const colorClass = computed(() => {
  switch (props.signal) {
    case 'positive':
    case 'bullish':
      return 'success'
    case 'negative':
    case 'bearish':
      return 'error'
    default:
      return 'neutral'
  }
})

const label = computed(() => {
  return props.signal?.toUpperCase() ?? 'N/A'
})
</script>

<template>
  <UBadge :color="colorClass" variant="solid" size="sm">
    {{ label }}
  </UBadge>
</template>
