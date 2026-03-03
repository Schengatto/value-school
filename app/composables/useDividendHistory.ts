interface AnnualDividend {
  year: number
  totalPerShare: number
  payments: number
  growthYoY: number | null
}

interface DividendHistoryResponse {
  annualDividends: AnnualDividend[]
  cagr5y: number | null
  consecutiveYears: number
}

export function useDividendHistory(symbol: MaybeRef<string>) {
  return useFetch<DividendHistoryResponse>(() => `/api/stocks/${toValue(symbol)}/dividends`, {
    key: `dividend-history-${toValue(symbol)}`
  })
}
