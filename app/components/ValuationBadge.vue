<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  signal: string | null
}>()

const colorMap: Record<string, string> = {
  undervalued: 'success',
  fairly_valued: 'warning',
  overvalued: 'error'
}

const labelMap: Record<string, string> = {
  undervalued: 'screener.valuation.undervalued',
  fairly_valued: 'screener.valuation.fairlyValued',
  overvalued: 'screener.valuation.overvalued'
}

const color = computed(() => props.signal ? colorMap[props.signal] || 'neutral' : 'neutral')
const label = computed(() => props.signal && labelMap[props.signal] ? t(labelMap[props.signal]) : '-')
</script>

<template>
  <UBadge v-if="signal" :color="color as any" variant="subtle" size="xs">
    {{ label }}
  </UBadge>
  <span v-else class="text-gray-400">-</span>
</template>
