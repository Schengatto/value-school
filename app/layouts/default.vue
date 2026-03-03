<script setup lang="ts">
const { data: lastUpdated } = await useFetch('/api/meta/last-updated')
const route = useRoute()
const { t, locale, setLocale } = useI18n()
const colorMode = useColorMode()

const navItems = computed(() => [
  { label: t('nav.home'), to: '/', icon: 'i-lucide-home' },
  { label: t('nav.screener'), to: '/screener', icon: 'i-lucide-search' },
  { label: t('nav.compare'), to: '/compare', icon: 'i-lucide-columns-3' },
  { label: t('nav.earnings'), to: '/earnings', icon: 'i-lucide-calendar' },
  { label: t('nav.dividends'), to: '/dividends', icon: 'i-lucide-coins' },
  { label: t('nav.ipo'), to: '/ipo', icon: 'i-lucide-rocket' }
])

function toggleLocale() {
  setLocale(locale.value === 'en' ? 'it' : 'en')
}

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const mobileMenuOpen = ref(false)

const { showWelcome, completeWelcome } = useWelcomeModal()

const { init: initPipelineProgress } = usePipelineProgress()
onMounted(() => {
  initPipelineProgress()
})
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gray-50/80 dark:bg-gray-950">
      <header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-6">
            <NuxtLink to="/" class="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100">
              <UIcon name="i-lucide-trending-up" class="text-green-600" />
              {{ $t('nav.brand') }}
            </NuxtLink>
            <nav class="hidden md:flex items-center gap-1">
              <NuxtLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                :class="route.path === item.to
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'"
              >
                <UIcon :name="item.icon" class="text-base" />
                {{ item.label }}
              </NuxtLink>
            </nav>
          </div>

          <div class="flex items-center gap-3">
            <div class="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
              <span v-if="lastUpdated?.lastUpdated">
                {{ $t('nav.lastUpdate') }} {{ new Date(lastUpdated.lastUpdated).toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }}
              </span>
            </div>
            <button
              class="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
              @click="toggleColorMode"
            >
              <UIcon :name="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'" class="text-lg" />
            </button>
            <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5">
              <button
                class="px-2.5 py-1 text-xs font-semibold rounded-full transition-all duration-200"
                :class="locale === 'en'
                  ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'"
                @click="setLocale('en')"
              >
                EN
              </button>
              <button
                class="px-2.5 py-1 text-xs font-semibold rounded-full transition-all duration-200"
                :class="locale === 'it'
                  ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'"
                @click="setLocale('it')"
              >
                IT
              </button>
            </div>
            <button
              class="md:hidden p-1.5 rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              @click="mobileMenuOpen = true"
            >
              <UIcon name="i-lucide-menu" class="text-xl" />
            </button>
          </div>
        </div>
      </header>

      <PipelineProgressBanner />

      <USlideover v-model:open="mobileMenuOpen" side="right">
        <template #header>
          <div class="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100">
            <UIcon name="i-lucide-trending-up" class="text-green-600" />
            {{ $t('nav.brand') }}
          </div>
        </template>
        <template #body>
          <nav class="flex flex-col gap-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors"
              :class="route.path === item.to
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'"
              @click="mobileMenuOpen = false"
            >
              <UIcon :name="item.icon" class="text-lg" />
              {{ item.label }}
            </NuxtLink>
          </nav>

          <div v-if="lastUpdated?.lastUpdated" class="mt-6 px-4 text-sm text-gray-400 dark:text-gray-500">
            {{ $t('nav.lastUpdate') }} {{ new Date(lastUpdated.lastUpdated).toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }}
          </div>
        </template>
      </USlideover>

      <main class="max-w-7xl mx-auto px-4 py-6">
        <slot />
      </main>

      <footer class="border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400 py-6 px-4">
        <div class="max-w-3xl mx-auto">
          <div class="flex items-center justify-center gap-1.5 mb-2">
            <UIcon name="i-lucide-alert-triangle" class="text-amber-500 text-base shrink-0" />
            <span class="font-semibold text-gray-600 dark:text-gray-300">Disclaimer</span>
          </div>
          <p class="text-xs leading-relaxed">{{ $t('nav.disclaimer') }}</p>
        </div>
        <p class="mt-3">
          {{ $t('nav.createdBy') }}
          <a href="https://www.enricoschintu.com" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">Schengatto</a>
        </p>
      </footer>
    </div>
    <WelcomeModal :open="showWelcome" @complete="completeWelcome" />
  </UApp>
</template>
