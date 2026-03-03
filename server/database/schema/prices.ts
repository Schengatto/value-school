import { pgTable, varchar, real, timestamp, integer, index } from 'drizzle-orm/pg-core'
import { stocks } from './stocks'

export const historicalPrices = pgTable('historical_prices', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  symbol: varchar('symbol', { length: 10 }).notNull().references(() => stocks.symbol, { onDelete: 'cascade' }),
  date: varchar('date', { length: 10 }).notNull(),
  open: real('open'),
  high: real('high'),
  low: real('low'),
  close: real('close')
}, (table) => [
  index('idx_hist_prices_symbol').on(table.symbol)
])

export const dailyPrices = pgTable('daily_prices', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  symbol: varchar('symbol', { length: 10 }).notNull().references(() => stocks.symbol, { onDelete: 'cascade' }),
  date: timestamp('date', { withTimezone: true }).notNull(),
  open: real('open'),
  high: real('high'),
  low: real('low'),
  close: real('close'),
  volume: integer('volume'),
  adjClose: real('adj_close')
}, (table) => [
  index('idx_daily_prices_symbol_date').on(table.symbol, table.date)
])
