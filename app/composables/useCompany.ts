import type { StockDetailResponse } from '~~/shared/types/api'

export function useCompany(symbol: string) {
  return useFetch<StockDetailResponse>(`/api/stocks/${symbol}`)
}
