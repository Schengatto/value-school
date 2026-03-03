import type { EarningsCalendarResponse } from '~~/shared/types/api'

export function useEarningsCalendar(params: Ref<Record<string, string>>) {
  return useFetch<EarningsCalendarResponse>('/api/earnings/calendar', {
    query: params,
    watch: [params]
  })
}
