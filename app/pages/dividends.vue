<script setup lang="ts">
useHead({ title: 'Dividends: Value School' })

const { t, locale } = useI18n()

const { startTour } = useDividendsTour()
const { showPrompt, dontAskAgain, dismissPrompt, startAndDismiss } = useTourPrompt()

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const monthOffset = ref(0)

const dateRange = computed(() => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth() + monthOffset.value, 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + monthOffset.value + 1, 0)
  return {
    startDate: toLocalDateStr(firstDay),
    endDate: toLocalDateStr(lastDay)
  }
})

const queryParams = computed(() => ({
  startDate: dateRange.value.startDate,
  endDate: dateRange.value.endDate
}))

const { data, status } = useDividendCalendar(queryParams)

const dividendsByDate = computed(() => {
  if (!data.value?.data) return new Map()
  const map = new Map<string, typeof data.value.data>()
  for (const item of data.value.data) {
    const dateKey = item.exDividendDate
    if (!map.has(dateKey)) map.set(dateKey, [])
    map.get(dateKey)!.push(item)
  }
  return map
})

const totalCount = computed(() => data.value?.data?.length ?? 0)

const monthLabel = computed(() => {
  const d = new Date(dateRange.value.startDate + 'T00:00:00')
  const loc = locale.value === 'it' ? 'it-IT' : 'en-US'
  const label = d.toLocaleDateString(loc, { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const weekdayHeaders = computed(() => {
  const loc = locale.value === 'it' ? 'it-IT' : 'en-US'
  const baseMonday = new Date(2024, 0, 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseMonday)
    d.setDate(baseMonday.getDate() + i)
    return d.toLocaleDateString(loc, { weekday: 'short' })
  })
})

const HIGH_YIELD_THRESHOLD = 1 // ≥ 1% per single distribution ≈ 4%+ annualized for quarterly

const MAX_YIELD_PER_DISTRIBUTION = 15 // 15% — defense in depth (API also filters)

function getDividendYield(item: { cashAmount: number, currentPrice: number | null }): number | null {
  if (!item.currentPrice || item.currentPrice <= 0) return null
  const y = (item.cashAmount / item.currentPrice) * 100
  if (y > MAX_YIELD_PER_DISTRIBUTION) return null // impossible yield, likely currency mismatch
  return y
}

function isHighYield(item: { cashAmount: number, currentPrice: number | null }): boolean {
  const y = getDividendYield(item)
  return y != null && y >= HIGH_YIELD_THRESHOLD
}

function getAnnualizedYield(item: { cashAmount: number, currentPrice: number | null, frequency: string | null }): number | null {
  const y = getDividendYield(item)
  if (y == null) return null
  const freq = item.frequency ? parseInt(item.frequency) : 1
  return y * (isNaN(freq) ? 1 : freq)
}

function dayHasHighYield(dateStr: string): boolean {
  const items = dividendsByDate.value.get(dateStr)
  if (!items) return false
  return items.some(item => isHighYield(item))
}

interface CalendarDay {
  date: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  dividendCount: number
}

const calendarGrid = computed<CalendarDay[]>(() => {
  const firstOfMonth = new Date(dateRange.value.startDate + 'T00:00:00')
  const year = firstOfMonth.getFullYear()
  const month = firstOfMonth.getMonth()
  const today = toLocalDateStr(new Date())
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const firstDow = firstOfMonth.getDay()
  const mondayOffset = firstDow === 0 ? 6 : firstDow - 1

  const days: CalendarDay[] = []

  // Previous month padding
  for (let i = mondayOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    const dateStr = toLocalDateStr(d)
    const dow = d.getDay()
    days.push({
      date: dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === today,
      isWeekend: dow === 0 || dow === 6,
      dividendCount: 0
    })
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    const dateStr = toLocalDateStr(d)
    const dow = d.getDay()
    days.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === today,
      isWeekend: dow === 0 || dow === 6,
      dividendCount: dividendsByDate.value.get(dateStr)?.length ?? 0
    })
  }

  // Next month padding
  let nextDay = 1
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, nextDay++)
    const dateStr = toLocalDateStr(d)
    const dow = d.getDay()
    days.push({
      date: dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === today,
      isWeekend: dow === 0 || dow === 6,
      dividendCount: 0
    })
  }

  return days
})

const drawerOpen = ref(false)
const selectedDate = ref<string | null>(null)

const selectedDayLabel = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(selectedDate.value + 'T00:00:00')
  const loc = locale.value === 'it' ? 'it-IT' : 'en-US'
  const label = d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const selectedDayDividends = computed(() => {
  if (!selectedDate.value) return []
  const items = [...(dividendsByDate.value.get(selectedDate.value) ?? [])]
  // Sort by yield descending (highest yield first)
  items.sort((a, b) => {
    const yieldA = getDividendYield(a) ?? -1
    const yieldB = getDividendYield(b) ?? -1
    return yieldB - yieldA
  })
  return items
})

function openDay(day: CalendarDay) {
  if (day.dividendCount === 0) return
  selectedDate.value = day.date
  drawerOpen.value = true
}

function formatFrequency(freq: string | null): string {
  if (!freq) return '-'
  const n = parseInt(freq)
  switch (n) {
    case 1: return t('dividends.frequency.annual')
    case 2: return t('dividends.frequency.semiAnnual')
    case 4: return t('dividends.frequency.quarterly')
    case 12: return t('dividends.frequency.monthly')
    default: return freq
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  const loc = locale.value === 'it' ? 'it-IT' : 'en-US'
  return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div>
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UIcon name="i-lucide-coins" class="text-green-600" />
            {{ $t('dividends.title') }}
          </h2>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ $t('dividends.countThisMonth', { count: totalCount }) }}</span>
        </div>
      </template>
      <template #footer>
          <div class="flex items-center justify-between relative">
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{ $t('dividends.description') }}
            </p>
            <UButton variant="ghost" color="neutral" size="xs" icon="i-lucide-circle-help" @click="startTour">
              {{ $t('dividends.guidedTour') }}
            </UButton>
            <TourPrompt
              :show="showPrompt"
              :dont-ask-again="dontAskAgain"
              @start="startAndDismiss(startTour)"
              @dismiss="dismissPrompt"
              @update:dont-ask-again="dontAskAgain = $event"
            />
          </div>
        </template>
      </UCard>

    <div class="flex items-center justify-between mb-6">
      <UButton
        icon="i-lucide-chevron-left"
        variant="outline"
        size="sm"
        @click="monthOffset--"
      >
        <span class="hidden sm:inline">{{ $t('common.previous') }}</span>
      </UButton>
      <div class="text-center">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ monthLabel }}</h3>
        <button
          v-if="monthOffset !== 0"
          class="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
          @click="monthOffset = 0"
        >
          {{ $t('common.backToCurrentMonth') }}
        </button>
      </div>
      <UButton
        icon="i-lucide-chevron-right"
        trailing
        variant="outline"
        size="sm"
        @click="monthOffset++"
      >
        <span class="hidden sm:inline">{{ $t('common.next') }}</span>
      </UButton>
    </div>

    <div v-if="status === 'pending'" class="text-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-gray-400 dark:text-gray-500" />
      <p class="mt-2 text-gray-500 dark:text-gray-400">{{ $t('dividends.loadingCalendar') }}</p>
    </div>

    <div v-else>
      <div class="grid grid-cols-7 gap-px mb-px">
        <div
          v-for="(header, i) in weekdayHeaders"
          :key="i"
          class="text-center text-xs font-semibold py-2 uppercase tracking-wide"
          :class="i >= 5 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'"
        >
          {{ header }}
        </div>
      </div>

      <div data-tour="dividends-calendar" class="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          v-for="day in calendarGrid"
          :key="day.date"
          type="button"
          class="bg-white dark:bg-gray-900 p-1.5 sm:p-2 min-h-[3.5rem] sm:min-h-[5rem] flex flex-col items-start text-left transition-colors"
          :class="[
            !day.isCurrentMonth ? 'bg-gray-50/80 dark:bg-gray-800/80' : '',
            day.isWeekend && day.isCurrentMonth ? 'bg-gray-50/40 dark:bg-gray-800/40' : '',
            day.isToday ? 'ring-2 ring-inset ring-green-500' : '',
            day.dividendCount > 0 && day.isCurrentMonth ? 'hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer' : 'cursor-default'
          ]"
          @click="openDay(day)"
        >
          <span
            class="text-xs sm:text-sm font-medium leading-none"
            :class="[
              day.isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-300 dark:text-gray-600',
              day.isToday ? 'bg-green-600 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs' : ''
            ]"
          >
            {{ day.dayNumber }}
          </span>

          <UBadge
            v-if="day.dividendCount > 0 && day.isCurrentMonth"
            :color="dayHasHighYield(day.date) ? 'success' : 'warning'"
            variant="subtle"
            size="xs"
            class="mt-auto text-[10px] sm:text-xs"
          >
            {{ day.dividendCount }}
          </UBadge>
        </button>
      </div>
    </div>

    <USlideover v-model:open="drawerOpen" :title="$t('dividends.dayDrawerTitle', { date: selectedDayLabel })">
      <template #body>
        <div v-if="selectedDayDividends.length === 0" class="text-center py-8 text-gray-400 dark:text-gray-500">
          <UIcon name="i-lucide-calendar-x" class="text-3xl mb-2" />
          <p>{{ $t('dividends.dayDrawerEmpty') }}</p>
        </div>

        <div v-else class="space-y-3">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {{ $t('dividends.dividendsCount', { count: selectedDayDividends.length }) }}
          </p>
          <UCard
            v-for="(item, idx) in selectedDayDividends"
            :key="item.ticker + idx"
            class="hover:shadow-md transition-shadow"
            :class="isHighYield(item) ? 'ring-1 ring-green-400 dark:ring-green-600' : ''"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <NuxtLink
                    :to="`/company/${item.ticker}`"
                    class="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
                    @click="drawerOpen = false"
                  >
                    {{ item.companyName ?? item.ticker }}
                  </NuxtLink>
                  <span class="text-xs text-gray-400 dark:text-gray-500">({{ item.ticker }})</span>
                  <UBadge v-if="isHighYield(item)" color="success" variant="subtle" size="xs">
                    {{ $t('dividends.highYield') }}
                  </UBadge>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-sm font-bold text-green-600">${{ item.cashAmount.toFixed(2) }}/{{ $t('dividends.share') }}</span>
                <div v-if="getDividendYield(item) != null" class="text-xs font-semibold mt-0.5" :class="isHighYield(item) ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'">
                  {{ $t('dividends.yield') }}: {{ getDividendYield(item)!.toFixed(2) }}%
                </div>
              </div>
            </div>

            <div class="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <div v-if="item.currentPrice" class="flex items-center gap-1">
                <UIcon name="i-lucide-dollar-sign" class="text-gray-400 dark:text-gray-500" />
                <span>{{ $t('dividends.price') }}: ${{ item.currentPrice.toFixed(2) }}</span>
              </div>

              <div v-if="getAnnualizedYield(item) != null" class="flex items-center gap-1">
                <UIcon name="i-lucide-trending-up" class="text-gray-400 dark:text-gray-500" />
                <span :class="getAnnualizedYield(item)! >= 4 ? 'text-green-600 dark:text-green-400 font-medium' : ''">
                  {{ $t('dividends.annualizedYield', { yield: getAnnualizedYield(item)!.toFixed(2) }) }}
                </span>
              </div>

              <div v-if="item.frequency" class="flex items-center gap-1">
                <UIcon name="i-lucide-repeat" class="text-gray-400 dark:text-gray-500" />
                <span>{{ formatFrequency(item.frequency) }}</span>
              </div>

              <div v-if="item.payDate" class="flex items-center gap-1">
                <UIcon name="i-lucide-calendar-check" class="text-gray-400 dark:text-gray-500" />
                <span>{{ $t('dividends.payDate') }}: {{ formatDate(item.payDate) }}</span>
              </div>

              <div v-if="item.recordDate" class="flex items-center gap-1">
                <UIcon name="i-lucide-clipboard-list" class="text-gray-400 dark:text-gray-500" />
                <span>{{ $t('dividends.recordDate') }}: {{ formatDate(item.recordDate) }}</span>
              </div>
            </div>

            <div v-if="item.compositeScore != null || item.overallSignal" class="flex items-center gap-2 mt-2">
              <ScoreBadge :score="item.compositeScore" />
              <SignalBadge :signal="item.overallSignal" />
            </div>
          </UCard>
        </div>
      </template>
    </USlideover>
  </div>
</template>
