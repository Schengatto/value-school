<script setup lang="ts">
const props = defineProps<{
  score: number | null
  lowConfidence?: boolean
}>()

const colorClass = computed(() => {
  if (props.lowConfidence) return 'neutral'
  const s = props.score ?? 0
  if (s >= 80) return 'success'
  if (s >= 65) return 'info'
  if (s >= 45) return 'neutral'
  if (s >= 25) return 'warning'
  return 'error'
})

const label = computed(() => {
  if (props.score == null) return '-'
  return props.lowConfidence ? `~${props.score}` : String(props.score)
})
</script>

<template>
  <UBadge :color="colorClass" variant="subtle" size="sm" :class="{ 'opacity-60': lowConfidence }">
    {{ label }}
  </UBadge>
</template>
