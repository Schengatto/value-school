import type { StockListItem, ScreenerItem, StockRecord, HistoricalPrice, DailyPrice, EarningsCalendarItem, IpoCalendarItem, DividendCalendarItem } from './stock'
import type { AnalysisRunStatus } from './analysis'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export type StockListResponse = PaginatedResponse<StockListItem>
export type ScreenerResponse = PaginatedResponse<ScreenerItem>

export interface StockDetailResponse extends StockRecord {
  historicalPrices: HistoricalPrice[]
  pricesDaily: DailyPrice[]
}

export interface LastUpdatedResponse {
  lastUpdated: string | null
}

export interface EarningsCalendarResponse {
  data: EarningsCalendarItem[]
  startDate: string
  endDate: string
}

export interface IpoCalendarResponse {
  data: IpoCalendarItem[]
  startDate: string
  endDate: string
}

export interface DividendCalendarResponse {
  data: DividendCalendarItem[]
  startDate: string
  endDate: string
}

export type AnalysisStatusResponse = AnalysisRunStatus | null
