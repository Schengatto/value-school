import type { IpoCalendarResponse } from '~~/shared/types/api'

export function useIpoCalendar(params: Ref<Record<string, string>>) {
  return useFetch<IpoCalendarResponse>('/api/ipo/calendar', {
    query: params,
    watch: [params]
  })
}
