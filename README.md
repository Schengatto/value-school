# Stocks Radar

A full-stack value investing analysis platform for NASDAQ large-cap stocks. Combines fundamental, technical, and valuation analysis with data from multiple financial APIs.

Built with Nuxt 4, Vue 3, TypeScript, and PostgreSQL.

## Features

- **Stock Screener** — Ranked table with filters, presets, and multi-criteria sorting
- **Company Detail** — Deep analysis across 6 sections: Overview, Financials, Valuation, Technical, Governance, Management Quality
- **Side-by-Side Comparison** — Compare up to 4 tickers at once
- **Investment Checklist** — Structured evaluation for any ticker
- **Earnings, Dividends & IPO Calendars** — Upcoming events with scoring
- **Composite Scoring** — 70% fundamental + 30% technical (0-100 scale)
- **Fair Value Estimates** — DCF, Graham, EPV, P/E-based models with margin of safety
- **Quality Metrics** — Piotroski F-Score, earnings quality, share dilution detection
- **Stock Classification** — Automatic value/growth/GARP/speculative categorization
- **Guided Tour** — Interactive walkthrough for new users (Driver.js)
- **Dark Mode** — Full support via Nuxt UI color mode
- **i18n** — English and Italian

## Tech Stack

| Layer         | Technology                                            |
| ------------- | ----------------------------------------------------- |
| Frontend      | Nuxt 4, Vue 3, TypeScript, Tailwind CSS 4, Nuxt UI    |
| Charts        | Chart.js, Lightweight Charts                          |
| Backend       | Nitro (Nuxt server), Drizzle ORM                      |
| Database      | PostgreSQL 17                                         |
| APIs          | Polygon.io, Yahoo Finance, Finnhub                    |
| Notifications | Telegram Bot                                          |
| Tour          | Driver.js                                             |
| Runtime       | Node.js 22 LTS, pnpm                                  |
| Deploy        | Docker, GitHub Actions CI/CD                          |

## Prerequisites

- **Node.js** >= 22.10
- **pnpm** >= 10.x
- **PostgreSQL** 17 (or use the provided Docker Compose)
- API keys for at least one of: [Polygon.io](https://polygon.io), [Finnhub](https://finnhub.io)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-user/stocks-radar.git
cd stocks-radar
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your API keys. At minimum you need:

- `DATABASE_URL` — PostgreSQL connection string
- At least one `POLYGON_API_KEY` or `FINNHUB_API_KEY`

Optional:

- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` for alert notifications
- `NUXT_PUBLIC_EXTERNAL_NEWS_URL` for an external news link on company pages

### 3. Start the database

Using Docker Compose (recommended for development):

```bash
docker compose up postgres -d
```

Or point `DATABASE_URL` to your existing PostgreSQL instance.

### 4. Run migrations

```bash
pnpm db:migrate
```

### 5. Start the dev server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

## Docker (Full Stack)

Run the entire stack (app + database) with Docker Compose:

```bash
docker compose up -d
```

The app will be available at `http://localhost:3100`.

## Commands

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `pnpm dev`           | Start development server     |
| `pnpm build`         | Build for production         |
| `pnpm lint`          | Run ESLint                   |
| `pnpm test`          | Run unit tests               |
| `pnpm test:watch`    | Run tests in watch mode      |
| `pnpm test:coverage` | Run tests with coverage      |
| `pnpm db:generate`   | Generate Drizzle migrations  |
| `pnpm db:migrate`    | Apply database migrations    |

## Project Structure

```text
app/                    # Frontend (pages, components, composables)
  pages/                # Route pages (screener, company detail, compare, etc.)
  components/           # Vue components
  composables/          # Shared composable functions
server/                 # Backend (API routes, services, database)
  services/pipeline/    # Analysis pipeline (orchestrator + ticker processor)
  services/analysis/    # Scoring engines (fundamental, technical, fair-value)
  services/connectors/  # External API clients (Polygon, Yahoo, Finnhub, Telegram)
  tasks/                # Scheduled cron tasks
  database/schema/      # Drizzle ORM schema definitions
shared/                 # Shared types and constants
i18n/locales/           # Translation files (en/, it/)
migrations/             # SQL migration files
scripts/                # Deployment and utility scripts
```

## Analysis Pipeline

The analysis pipeline processes each ticker through these stages:

1. **Data Fetch** — Parallel requests to Yahoo Finance, Polygon.io, and Finnhub
2. **Multi-source Fallback** — Polygon -> Yahoo fundamentals -> Yahoo quote summary
3. **Finnhub Hydration** — Fills remaining gaps from per-share metrics
4. **Fundamental Scoring** — 30+ weighted criteria -> score 0-100
5. **Technical Analysis** — RSI, SMA 50/200, MACD, ROC, volatility -> score 0-100
6. **Classification** — Value / Growth / GARP / Speculative
7. **Fair Value** — DCF + Graham + EPV + P/E-based estimates with margin of safety
8. **Quality Metrics** — Piotroski F-Score, earnings quality, share dilution

Scheduled tasks (configurable in `nuxt.config.ts`):

- **Daily 01:00 UTC** — Full pipeline run (~200 tickers)
- **Hourly** — Retry failed tickers
- **Every 5 min** — Watchdog for stalled pipelines
- **Monday 08:00 UTC** — IPO summary via Telegram

## API Keys

The platform supports key rotation for rate-limited APIs:

| API        | Keys Supported | Purpose                          |
| ---------- | -------------- | -------------------------------- |
| Polygon.io | Up to 5        | Financial data (primary source)  |
| Finnhub    | Up to 6        | Enrichment metrics               |
| Telegram   | 1              | Alert notifications              |

Free-tier API keys work fine — the pipeline includes rate limiting and a 15-second delay between tickers.

## Testing

```bash
pnpm test              # Run all tests
pnpm test:coverage     # Run with coverage report
```

Tests cover the analysis layer: composite scoring, stock classification, technical indicators, fair value calculations, fundamental scoring, and utilities.

## Deployment

The project includes a GitHub Actions workflow that builds a Docker image and deploys via SSH on push to `main`.

Required GitHub Secrets:

- `VPS_HOST` — Server IP/hostname
- `VPS_SSH_KEY` — SSH private key
- `DEPLOY_PATH` — Path to the project on the server

The deploy script (`scripts/deploy.sh`) is fully parameterized via environment variables. See the script header for configuration options.

## License

MIT
