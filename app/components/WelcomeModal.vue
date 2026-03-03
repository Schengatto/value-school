<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  complete: [locale: string]
}>()

const { locale, setLocale } = useI18n()
const selectedLocale = ref(locale.value)

function selectLocale(code: string) {
  selectedLocale.value = code
  setLocale(code)
}

function confirm() {
  emit('complete', selectedLocale.value)
}
</script>

<template>
  <UModal
    :open="props.open"
    :close="false"
    :dismissible="false"
    :ui="{ width: 'sm:max-w-lg' }"
  >
    <template #header>
      <div class="flex flex-col items-center text-center w-full pt-2">
        <div class="flex items-center gap-2 mb-1">
          <UIcon name="i-lucide-trending-up" class="text-green-600 text-2xl" />
          <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">
            {{ $t('welcome.title') }}
          </h2>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ $t('welcome.subtitle') }}
        </p>
      </div>
    </template>

    <template #body>
      <div class="space-y-5">
        <div>
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {{ $t('welcome.selectLanguage') }}
          </p>
          <div class="grid grid-cols-2 gap-3">
            <button
              class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200"
              :class="selectedLocale === 'en'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'"
              @click="selectLocale('en')"
            >
              <span class="text-3xl">🇬🇧</span>
              <span class="text-sm font-semibold" :class="selectedLocale === 'en' ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'">
                {{ $t('welcome.english') }}
              </span>
            </button>
            <button
              class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200"
              :class="selectedLocale === 'it'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'"
              @click="selectLocale('it')"
            >
              <span class="text-3xl">🇮🇹</span>
              <span class="text-sm font-semibold" :class="selectedLocale === 'it' ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'">
                {{ $t('welcome.italian') }}
              </span>
            </button>
          </div>
        </div>

        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div class="flex gap-2">
            <UIcon name="i-lucide-info" class="text-amber-600 dark:text-amber-400 text-base shrink-0 mt-0.5" />
            <p class="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              {{ $t('welcome.disclaimer') }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-center w-full">
        <UButton
          size="lg"
          color="primary"
          class="px-8"
          @click="confirm"
        >
          {{ $t('welcome.continue') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
