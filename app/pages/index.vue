<script setup lang="ts">
useHead({ title: 'Value School - Learn Value Investing' })
const { t } = useI18n()
</script>

<template>
  <div>
    <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-green-950/40 dark:via-gray-900 dark:to-emerald-950/30 border border-green-100 dark:border-green-900/40 px-6 py-16 sm:py-24 text-center mb-12">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-200/30 via-transparent to-transparent dark:from-green-800/20" />
      <div class="relative max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <UIcon name="i-lucide-graduation-cap" class="text-base" />
          Value School
        </div>
        <h1 class="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight mb-4">
          {{ t('landing.hero.title') }}
        </h1>
        <p class="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
          {{ t('landing.hero.subtitle') }}
        </p>
        <UButton
          :to="'/screener'"
          size="lg"
          color="primary"
          icon="i-lucide-search"
        >
          {{ t('landing.hero.ctaScreener') }}
        </UButton>
      </div>
    </section>

    <section id="value-investing" class="mb-16">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {{ t('landing.valueInvesting.sectionTitle') }}
        </h2>
        <p class="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          {{ t('landing.valueInvesting.sectionSubtitle') }}
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UCard>
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mb-4">
              <UIcon name="i-lucide-shield-check" class="text-2xl" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {{ t('landing.valueInvesting.pillar1Title') }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {{ t('landing.valueInvesting.pillar1Description') }}
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mb-4">
              <UIcon name="i-lucide-bar-chart-3" class="text-2xl" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {{ t('landing.valueInvesting.pillar2Title') }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {{ t('landing.valueInvesting.pillar2Description') }}
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 mb-4">
              <UIcon name="i-lucide-clock" class="text-2xl" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {{ t('landing.valueInvesting.pillar3Title') }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {{ t('landing.valueInvesting.pillar3Description') }}
            </p>
          </div>
        </UCard>
      </div>
    </section>

    <section class="mb-16">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {{ t('landing.learningPath.sectionTitle') }}
        </h2>
        <p class="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          {{ t('landing.learningPath.sectionSubtitle') }}
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="relative p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div class="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shadow">1</div>
          <UIcon name="i-lucide-search" class="text-2xl text-green-600 dark:text-green-400 mb-3" />
          <h3 class="font-semibold text-gray-900 dark:text-white mb-1">
            {{ t('landing.learningPath.step1Title') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('landing.learningPath.step1Description') }}
          </p>
        </div>
        <div class="relative p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div class="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shadow">2</div>
          <UIcon name="i-lucide-calculator" class="text-2xl text-green-600 dark:text-green-400 mb-3" />
          <h3 class="font-semibold text-gray-900 dark:text-white mb-1">
            {{ t('landing.learningPath.step2Title') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('landing.learningPath.step2Description') }}
          </p>
        </div>
        <div class="relative p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div class="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shadow">3</div>
          <UIcon name="i-lucide-scale" class="text-2xl text-green-600 dark:text-green-400 mb-3" />
          <h3 class="font-semibold text-gray-900 dark:text-white mb-1">
            {{ t('landing.learningPath.step3Title') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('landing.learningPath.step3Description') }}
          </p>
        </div>
        <div class="relative p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div class="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shadow">4</div>
          <UIcon name="i-lucide-check-circle" class="text-2xl text-green-600 dark:text-green-400 mb-3" />
          <h3 class="font-semibold text-gray-900 dark:text-white mb-1">
            {{ t('landing.learningPath.step4Title') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('landing.learningPath.step4Description') }}
          </p>
        </div>
      </div>
    </section>

    <section class="mb-16">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {{ t('landing.features.sectionTitle') }}
        </h2>
        <p class="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          {{ t('landing.features.sectionSubtitle') }}
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <UIcon name="i-lucide-book-open" class="text-xl" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">{{ t('landing.features.glossaryTitle') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('landing.features.glossaryDescription') }}</p>
          </div>
        </div>
        <div class="flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <UIcon name="i-lucide-compass" class="text-xl" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">{{ t('landing.features.tourTitle') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('landing.features.tourDescription') }}</p>
          </div>
        </div>
        <div class="flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <UIcon name="i-lucide-bar-chart-3" class="text-xl" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">{{ t('landing.features.fundamentalTitle') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('landing.features.fundamentalDescription') }}</p>
          </div>
        </div>
        <div class="flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <UIcon name="i-lucide-scale" class="text-xl" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">{{ t('landing.features.fairValueTitle') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('landing.features.fairValueDescription') }}</p>
          </div>
        </div>
        <div class="flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <UIcon name="i-lucide-activity" class="text-xl" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">{{ t('landing.features.technicalTitle') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('landing.features.technicalDescription') }}</p>
          </div>
        </div>
        <div class="flex items-start gap-4 p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <UIcon name="i-lucide-users" class="text-xl" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">{{ t('landing.features.managementTitle') }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('landing.features.managementDescription') }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-8 px-4 py-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
      <div class="flex gap-3">
        <UIcon name="i-lucide-alert-triangle" class="text-amber-500 text-lg shrink-0 mt-0.5" />
        <p class="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
          {{ t('disclaimer.landing') }}
        </p>
      </div>
    </section>

    <section class="text-center py-12 px-6 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 mb-4">
      <h2 class="text-2xl sm:text-3xl font-bold text-white mb-3">
        {{ t('landing.cta.title') }}
      </h2>
      <p class="text-green-100 max-w-lg mx-auto mb-6">
        {{ t('landing.cta.subtitle') }}
      </p>
      <UButton
        :to="'/screener'"
        size="lg"
        color="white"
        variant="solid"
        icon="i-lucide-arrow-right"
      >
        {{ t('landing.cta.button') }}
      </UButton>
    </section>
  </div>
</template>
