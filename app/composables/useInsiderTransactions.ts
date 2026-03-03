import type { InsiderTransaction, InsiderSentiment } from '~~/shared/types/stock'

interface InsiderTransactionsResponse {
  transactions: InsiderTransaction[]
  sentiment: InsiderSentiment[]
}

export function useInsiderTransactions(symbol: MaybeRef<string>) {
  return useFetch<InsiderTransactionsResponse>(() => `/api/stocks/${toValue(symbol)}/insider-transactions`, {
    key: `insider-transactions-${toValue(symbol)}`,
    lazy: true
  })
}
