CREATE TABLE "stocks" (
	"symbol" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"company_summary" jsonb,
	"asset_profile" jsonb,
	"yahoo_quote" jsonb,
	"current_price" real,
	"rsi_monthly" real,
	"fundamental_score" integer,
	"fundamental_signal" varchar(20),
	"fundamental_reasons" jsonb,
	"pe" real,
	"roe" real,
	"revenue" real,
	"net_income" real,
	"free_cash_flow" real,
	"total_liabilities" real,
	"total_equity" real,
	"current_ratio" real,
	"interest_coverage" real,
	"debt_to_ebitda" real,
	"technical_score" integer,
	"technical_signal" varchar(20),
	"technical_data" jsonb,
	"composite_score" integer,
	"overall_signal" varchar(20),
	"fmp_data" jsonb,
	"eps_history" jsonb,
	"sector" varchar(100),
	"industry" varchar(100),
	"country" varchar(100),
	"analysis_run_id" integer,
	"analyzed_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_prices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "daily_prices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"symbol" varchar(10) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"open" real,
	"high" real,
	"low" real,
	"close" real,
	"volume" integer,
	"adj_close" real
);
--> statement-breakpoint
CREATE TABLE "historical_prices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "historical_prices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"symbol" varchar(10) NOT NULL,
	"date" varchar(10) NOT NULL,
	"open" real,
	"high" real,
	"low" real,
	"close" real
);
--> statement-breakpoint
CREATE TABLE "analysis_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_tickers" integer NOT NULL,
	"processed_tickers" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_processed_symbol" varchar(10),
	"errors" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "daily_prices" ADD CONSTRAINT "daily_prices_symbol_stocks_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."stocks"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_prices" ADD CONSTRAINT "historical_prices_symbol_stocks_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."stocks"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_stocks_composite_score" ON "stocks" USING btree ("composite_score");--> statement-breakpoint
CREATE INDEX "idx_stocks_fundamental_score" ON "stocks" USING btree ("fundamental_score");--> statement-breakpoint
CREATE INDEX "idx_stocks_technical_score" ON "stocks" USING btree ("technical_score");--> statement-breakpoint
CREATE INDEX "idx_stocks_sector" ON "stocks" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "idx_stocks_country" ON "stocks" USING btree ("country");--> statement-breakpoint
CREATE INDEX "idx_stocks_overall_signal" ON "stocks" USING btree ("overall_signal");--> statement-breakpoint
CREATE INDEX "idx_daily_prices_symbol_date" ON "daily_prices" USING btree ("symbol","date");--> statement-breakpoint
CREATE INDEX "idx_hist_prices_symbol" ON "historical_prices" USING btree ("symbol");