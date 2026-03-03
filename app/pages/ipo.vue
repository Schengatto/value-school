<script setup lang="ts">
useHead({ title: 'IPO - Value School' })

const { t, locale } = useI18n()

const { startTour } = useIpoTour()
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

const { data, status } = useIpoCalendar(queryParams)

const iposByDate = computed(() => {
  if (!data.value?.data) return new Map()
  const map = new Map<string, typeof data.value.data>()
  for (const item of data.value.data) {
    const dateKey = item.listingDate ?? 'unknown'
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

interface CalendarDay {
  date: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  ipoCount: number
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
      ipoCount: 0
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
      ipoCount: iposByDate.value.get(dateStr)?.length ?? 0
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
      ipoCount: 0
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

const selectedDayIpos = computed(() => {
  if (!selectedDate.value) return []
  return iposByDate.value.get(selectedDate.value) ?? []
})

function openDay(day: CalendarDay) {
  if (day.ipoCount === 0) return
  selectedDate.value = day.date
  drawerOpen.value = true
}

function statusColor(s: string | null): string {
  switch (s) {
    case 'new': return 'success'
    case 'pending': return 'warning'
    case 'direct_listing_process': return 'info'
    case 'rumor': return 'neutral'
    case 'history': return 'neutral'
    default: return 'neutral'
  }
}

function statusLabel(s: string | null): string {
  switch (s) {
    case 'new': return t('ipo.status.new')
    case 'pending': return t('ipo.status.pending')
    case 'direct_listing_process': return t('ipo.status.directListing')
    case 'rumor': return t('ipo.status.rumor')
    case 'history': return t('ipo.status.history')
    case 'withdrawn': return t('ipo.status.withdrawn')
    default: return s ?? t('ipo.status.unknown')
  }
}

function formatAmount(value: number | null): string {
  if (value == null) return '-'
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function formatShares(value: number | null): string {
  if (value == null) return '-'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toLocaleString()
}
</script>

<template>
  <div>
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UIcon name="i-lucide-rocket" class="text-green-600" />
            {{ $t('ipo.title') }}
          </h2>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ $t('ipo.countThisMonth', { count: totalCount }) }}</span>
        </div>
      </template>
      <template #footer>
          <div class="flex items-center justify-between relative">
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{ $t('ipo.description') }}
            </p>
            <UButton variant="ghost" color="neutral" size="xs" icon="i-lucide-circle-help" @click="startTour">
              {{ $t('ipo.guidedTour') }}
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
      <p class="mt-2 text-gray-500 dark:text-gray-400">{{ $t('ipo.loadingCalendar') }}</p>
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

      <div data-tour="ipo-calendar" class="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          v-for="day in calendarGrid"
          :key="day.date"
          type="button"
          class="bg-white dark:bg-gray-900 p-1.5 sm:p-2 min-h-[3.5rem] sm:min-h-[5rem] flex flex-col items-start text-left transition-colors"
          :class="[
            !day.isCurrentMonth ? 'bg-gray-50/80 dark:bg-gray-800/80' : '',
            day.isWeekend && day.isCurrentMonth ? 'bg-gray-50/40 dark:bg-gray-800/40' : '',
            day.isToday ? 'ring-2 ring-inset ring-green-500' : '',
            day.ipoCount > 0 && day.isCurrentMonth ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer' : 'cursor-default'
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
            v-if="day.ipoCount > 0 && day.isCurrentMonth"
            color="info"
            variant="subtle"
            size="xs"
            class="mt-auto text-[10px] sm:text-xs"
          >
            {{ day.ipoCount }}
          </UBadge>
        </button>
      </div>
    </div>

    <USlideover v-model:open="drawerOpen" :title="$t('ipo.dayDrawerTitle', { date: selectedDayLabel })">
      <template #body>
        <div v-if="selectedDayIpos.length === 0" class="text-center py-8 text-gray-400 dark:text-gray-500">
          <UIcon name="i-lucide-calendar-x" class="text-3xl mb-2" />
          <p>{{ $t('ipo.dayDrawerEmpty') }}</p>
        </div>

        <div v-else class="space-y-3">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {{ $t('ipo.iposCount', { count: selectedDayIpos.length }) }}
          </p>
          <UCard
            v-for="(item, idx) in selectedDayIpos"
            :key="item.ticker ?? idx"
            class="hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {{ item.companyName ?? 'N/A' }}
                </div>
                <span v-if="item.ticker" class="text-xs text-gray-400 dark:text-gray-500">({{ item.ticker }})</span>
              </div>
              <UBadge :color="statusColor(item.ipoStatus)" variant="subtle" size="xs">
                {{ statusLabel(item.ipoStatus) }}
              </UBadge>
            </div>

            <div class="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <div v-if="item.priceRangeLow || item.priceRangeHigh || item.priceFinal" class="flex items-center gap-1">
                <UIcon name="i-lucide-dollar-sign" class="text-gray-400 dark:text-gray-500" />
                <span v-if="item.priceFinal" class="font-semibold text-gray-800 dark:text-gray-200">${{ item.priceFinal.toFixed(2) }}</span>
                <span v-else-if="item.priceRangeLow && item.priceRangeHigh">
                  ${{ item.priceRangeLow.toFixed(2) }} - ${{ item.priceRangeHigh.toFixed(2) }}
                </span>
              </div>

              <div v-if="item.sharesOutstanding" class="flex items-center gap-1">
                <UIcon name="i-lucide-bar-chart-3" class="text-gray-400 dark:text-gray-500" />
                <span>{{ $t('ipo.shares', { count: formatShares(item.sharesOutstanding) }) }}</span>
              </div>

              <div v-if="item.totalAmountRaised" class="flex items-center gap-1">
                <UIcon name="i-lucide-banknote" class="text-gray-400 dark:text-gray-500" />
                <span>{{ $t('ipo.raised', { amount: formatAmount(item.totalAmountRaised) }) }}</span>
              </div>
            </div>
          </UCard>
        </div>
      </template>
    </USlideover>
  </div>
</template>
