import type { DividendCalendarResponse } from '~~/shared/types/api'

export function useDividendCalendar(params: Ref<Record<string, string>>) {
  return useFetch<DividendCalendarResponse>('/api/dividends/calendar', {
    query: params,
    watch: [params]
  })
}
