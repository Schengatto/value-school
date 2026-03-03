export function useChartColors() {
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')

  return {
    isDark,
    titleColor: computed(() => isDark.value ? '#d1d5db' : '#374151'),
    labelColor: computed(() => isDark.value ? '#9ca3af' : '#6b7280'),
    gridColor: computed(() => isDark.value ? '#374151' : '#f3f4f6'),
    bgColor: computed(() => isDark.value ? '#111827' : '#ffffff'),
    borderColor: computed(() => isDark.value ? '#4b5563' : '#e5e7eb')
  }
}
