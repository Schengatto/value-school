import { pgTable, integer, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const analysisRuns = pgTable('analysis_runs', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  totalTickers: integer('total_tickers').notNull(),
  processedTickers: integer('processed_tickers').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  lastProcessedSymbol: varchar('last_processed_symbol', { length: 10 }),
  errors: jsonb('errors'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})
