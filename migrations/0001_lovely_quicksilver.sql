ALTER TABLE "stocks" ADD COLUMN "earnings_date" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_stocks_earnings_date" ON "stocks" USING btree ("earnings_date");