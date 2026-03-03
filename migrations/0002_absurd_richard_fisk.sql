ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "fair_value" real;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "fair_value_low" real;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "fair_value_high" real;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "margin_of_safety" real;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "valuation_signal" varchar(20);--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "fair_value_data" jsonb;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "stock_category" varchar(20);--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "classification_data" jsonb;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "piotroski_score" integer;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "piotroski_details" jsonb;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "earnings_quality" real;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "share_dilution" real;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN IF NOT EXISTS "finnhub_data" jsonb;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
