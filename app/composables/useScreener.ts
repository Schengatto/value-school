import type { ScreenerResponse } from '~~/shared/types/api'

export function useScreener(params: Ref<Record<string, string | number>>) {
  return useFetch<ScreenerResponse>('/api/stocks/screener', {
    query: params,
    watch: [params]
  })
}
