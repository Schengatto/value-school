<script setup lang="ts">
useHead({ title: 'Earnings - Value School' })

const { t, locale } = useI18n()

const { startTour } = useEarningsTour()
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

const { data, status } = useEarningsCalendar(queryParams)

const earningsByDate = computed(() => {
  if (!data.value?.data) return new Map()
  const map = new Map<string, typeof data.value.data>()
  for (const item of data.value.data) {
    const dateKey = toLocalDateStr(new Date(item.earningsDate))
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
  // 2024-01-01 is a Monday
  const baseMonday = new Date(2024, 0, 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseMonday)
    d.setDate(baseMonday.getDate() + i)
    return d.toLocaleDateString(loc, { weekday: 'short' })
  })
})

interface CalendarDay {
  date: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  earningsCount: number
}

const calendarGrid = computed<CalendarDay[]>(() => {
  const firstOfMonth = new Date(dateRange.value.startDate + 'T00:00:00')
  const year = firstOfMonth.getFullYear()
  const month = firstOfMonth.getMonth()
  const today = toLocalDateStr(new Date())
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Monday-based offset: Mon=0, Tue=1, ..., Sun=6
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
      earningsCount: 0
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
      earningsCount: earningsByDate.value.get(dateStr)?.length ?? 0
    })
  }

  // Next month padding (fill to complete last row)
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
      earningsCount: 0
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

const selectedDayEarnings = computed(() => {
  if (!selectedDate.value) return []
  return earningsByDate.value.get(selectedDate.value) ?? []
})

function openDay(day: CalendarDay) {
  if (day.earningsCount === 0) return
  selectedDate.value = day.date
  drawerOpen.value = true
}

const searchQuery = ref('')
const isSearching = computed(() => searchQuery.value.trim().length > 0)

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q || !data.value?.data) return []

  const filtered = data.value.data.filter(item =>
    item.name?.toLowerCase().includes(q) || item.symbol?.toLowerCase().includes(q)
  )

  // Group by date for display
  const grouped = new Map<string, typeof filtered>()
  for (const item of filtered) {
    const dateKey = toLocalDateStr(new Date(item.earningsDate))
    if (!grouped.has(dateKey)) grouped.set(dateKey, [])
    grouped.get(dateKey)!.push(item)
  }

  // Sort dates chronologically
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))
})

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const loc = locale.value === 'it' ? 'it-IT' : 'en-US'
  const label = d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatPrice(price: number | null): string {
  if (price == null) return '-'
  return `$${price.toFixed(2)}`
}

function formatEarningsTime(isoDate: string): string | null {
  const d = new Date(isoDate)
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return null

  const etHour = d.getUTCHours() - 5 + (isDST(d) ? 1 : 0)
  const etMin = d.getUTCMinutes()
  const etDecimal = etHour + etMin / 60

  const localTime = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

  if (etDecimal < 9.5) return `Pre-market · ${localTime}`
  if (etDecimal >= 16) return `After-hours · ${localTime}`
  return localTime
}

function isDST(d: Date): boolean {
  const year = d.getUTCFullYear()
  const marDay1 = new Date(Date.UTC(year, 2, 1)).getUTCDay()
  const secondSunMar = 1 + ((7 - marDay1) % 7) + 7
  const dstStart = Date.UTC(year, 2, secondSunMar, 7)
  const novDay1 = new Date(Date.UTC(year, 10, 1)).getUTCDay()
  const firstSunNov = 1 + ((7 - novDay1) % 7)
  const dstEnd = Date.UTC(year, 10, firstSunNov, 6)
  return d.getTime() >= dstStart && d.getTime() < dstEnd
}
</script>

<template>
  <div>
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UIcon name="i-lucide-calendar" class="text-green-600" />
            {{ $t('earnings.title') }}
          </h2>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ $t('earnings.countThisMonth', { count: totalCount }) }}</span>
        </div>
      </template>
      <template #footer>
          <div class="flex items-center justify-between relative">
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{ $t('earnings.description') }}
            </p>
            <UButton variant="ghost" color="neutral" size="xs" icon="i-lucide-circle-help" @click="startTour">
              {{ $t('earnings.guidedTour') }}
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

    <div data-tour="earnings-search" class="mb-6">
      <UInput
        v-model="searchQuery"
        :placeholder="$t('earnings.searchPlaceholder')"
        icon="i-lucide-search"
        size="md"
        class="w-full"
        :ui="{ trailing: 'pointer-events-auto' }"
      >
        <template v-if="searchQuery" #trailing>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="link"
            size="sm"
            @click="searchQuery = ''"
          />
        </template>
      </UInput>
    </div>

    <div v-if="!isSearching" class="flex items-center justify-between mb-6">
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

    <div v-if="isSearching">
      <div v-if="searchResults.length === 0 && status !== 'pending'" class="text-center py-12 text-gray-400 dark:text-gray-500">
        <UIcon name="i-lucide-search-x" class="text-4xl mb-2" />
        <p>{{ $t('earnings.searchNoResults', { query: searchQuery.trim() }) }}</p>
      </div>

      <div v-else class="space-y-6">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ $t('earnings.searchResults', { count: searchResults.reduce((sum, [, items]) => sum + items.length, 0), query: searchQuery.trim() }) }}
        </p>
        <div v-for="[dateStr, items] in searchResults" :key="dateStr">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
            <UIcon name="i-lucide-calendar" class="text-green-600" />
            {{ formatDateLabel(dateStr) }}
          </h4>
          <div class="space-y-2">
            <UCard
              v-for="item in items"
              :key="item.symbol"
              class="hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <NuxtLink
                    :to="`/company/${item.symbol}`"
                    class="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
                  >
                    {{ item.name }}
                  </NuxtLink>
                  <span class="ml-1 text-gray-400 dark:text-gray-500 text-xs">({{ item.symbol }})</span>
                  <UBadge
                    v-if="formatEarningsTime(item.earningsDate)"
                    color="info"
                    variant="subtle"
                    size="xs"
                    class="ml-1"
                  >
                    <UIcon name="i-lucide-clock" class="mr-0.5" />
                    {{ formatEarningsTime(item.earningsDate) }}
                  </UBadge>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-if="item.sector" class="text-xs text-gray-500 dark:text-gray-400">{{ item.sector }}</span>
                    <span v-if="item.sector && item.industry" class="text-xs text-gray-300 dark:text-gray-600">|</span>
                    <span v-if="item.industry" class="text-xs text-gray-400 dark:text-gray-500">{{ item.industry }}</span>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {{ formatPrice(item.currentPrice) }}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 mt-2">
                <ScoreBadge :score="item.compositeScore" />
                <SignalBadge :signal="item.overallSignal" />
                <span class="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                  F: {{ item.fundamentalScore ?? '-' }} | T: {{ item.technicalScore ?? '-' }}
                </span>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="status === 'pending'" class="text-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-gray-400 dark:text-gray-500" />
      <p class="mt-2 text-gray-500 dark:text-gray-400">{{ $t('earnings.loadingCalendar') }}</p>
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

      <div data-tour="earnings-calendar" class="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          v-for="day in calendarGrid"
          :key="day.date"
          type="button"
          class="bg-white dark:bg-gray-900 p-1.5 sm:p-2 min-h-[3.5rem] sm:min-h-[5rem] flex flex-col items-start text-left transition-colors"
          :class="[
            !day.isCurrentMonth ? 'bg-gray-50/80 dark:bg-gray-800/80' : '',
            day.isWeekend && day.isCurrentMonth ? 'bg-gray-50/40 dark:bg-gray-800/40' : '',
            day.isToday ? 'ring-2 ring-inset ring-green-500' : '',
            day.earningsCount > 0 && day.isCurrentMonth ? 'hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer' : 'cursor-default'
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
            v-if="day.earningsCount > 0 && day.isCurrentMonth"
            color="success"
            variant="subtle"
            size="xs"
            class="mt-auto text-[10px] sm:text-xs"
          >
            {{ day.earningsCount }}
          </UBadge>
        </button>
      </div>
    </div>

    <USlideover v-model:open="drawerOpen" :title="$t('earnings.dayDrawerTitle', { date: selectedDayLabel })">
      <template #body>
        <div v-if="selectedDayEarnings.length === 0" class="text-center py-8 text-gray-400 dark:text-gray-500">
          <UIcon name="i-lucide-calendar-x" class="text-3xl mb-2" />
          <p>{{ $t('earnings.dayDrawerEmpty') }}</p>
        </div>

        <div v-else class="space-y-3">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {{ $t('earnings.earningsCount', { count: selectedDayEarnings.length }) }}
          </p>
          <UCard
            v-for="item in selectedDayEarnings"
            :key="item.symbol"
            class="hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <NuxtLink
                  :to="`/company/${item.symbol}`"
                  class="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
                  @click="drawerOpen = false"
                >
                  {{ item.name }}
                </NuxtLink>
                <span class="ml-1 text-gray-400 dark:text-gray-500 text-xs">({{ item.symbol }})</span>
                <UBadge
                  v-if="formatEarningsTime(item.earningsDate)"
                  color="info"
                  variant="subtle"
                  size="xs"
                  class="ml-1"
                >
                  <UIcon name="i-lucide-clock" class="mr-0.5" />
                  {{ formatEarningsTime(item.earningsDate) }}
                </UBadge>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span v-if="item.sector" class="text-xs text-gray-500 dark:text-gray-400">{{ item.sector }}</span>
                  <span v-if="item.sector && item.industry" class="text-xs text-gray-300 dark:text-gray-600">|</span>
                  <span v-if="item.industry" class="text-xs text-gray-400 dark:text-gray-500">{{ item.industry }}</span>
                </div>
              </div>
              <div class="text-right shrink-0">
                <div class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {{ formatPrice(item.currentPrice) }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <ScoreBadge :score="item.compositeScore" />
              <SignalBadge :signal="item.overallSignal" />
              <span class="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                F: {{ item.fundamentalScore ?? '-' }} | T: {{ item.technicalScore ?? '-' }}
              </span>
            </div>
          </UCard>
        </div>
      </template>
    </USlideover>
  </div>
</template>
