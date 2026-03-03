# Value School - Product Design

## Vision

Value School is an educational platform that teaches value investing methodology through practical analysis of NASDAQ large-cap stocks. Unlike traditional stock screeners that show raw data, Value School guides users step by step through learning fundamental, technical, and valuation analysis, turning complex concepts into accessible, actionable tools — even for beginners.

---

## Target Audience

| Segment | Profile | Need |
| ------- | ------- | ---- |
| **Curious beginner** | 18-35 years old, no investing experience, wants to understand how to evaluate a stock | Educational tools with contextual explanations |
| **Self-taught investor** | 25-50 years old, has read Buffett/Graham books, looking for a tool to apply theory | Automated scoring and side-by-side comparisons |
| **Finance student** | 20-28 years old, academic background, wants hands-on practice with real data | Professional metrics with transparent methodology |

---

## Value Proposition

**For the user**: "Learn to evaluate stocks like a professional value investor, using real data and a transparent methodology."

**Differentiation**:

- Not a financial advisory service, but a practical school
- Every data point is accompanied by an explanation of why it matters
- Guided tours that ask questions before giving answers
- Transparent scoring system with 30+ weighted, visible criteria
- Integrated glossary and contextual helpers on every metric

---

## Functional Architecture

### First Visit

On the first visit, the user sees a **welcome modal** that:

- Asks them to select a preferred language (English / Italian)
- Reminds them that all data is purely indicative and for educational purposes
- Cannot be dismissed without interaction: the user must choose a language and confirm

The preference is saved in localStorage and the modal is not shown again on subsequent visits.

### Main User Flow

```text
Welcome Modal ──> Landing Page ──> Screener ──> Company Detail
(first visit)         │               │               │
                      │               │               ├── Compare (up to 4 tickers)
                      │               │               │
                      └── Calendars ──┤               ├── Analysis Quiz
                                      │               │
                                      ├── Earnings    └── Educational Guided Tour
                                      ├── Dividends
                                      └── IPO
```

### Pages and Features

#### 1. Landing Page

Educational entry page that introduces value investing principles.

**Sections**:

- Hero with "Value School" badge and CTA to the Screener
- Methodology explanation (inspired by Buffett and Graham)
- 14 evaluation criteria presented didactically (expandable)
- Clearly visible educational disclaimer
- Final CTA to the Screener

**Goal**: convince the user that value investing is a rational and accessible approach, and that Value School is the right tool to learn it.

#### 2. Screener

Interactive ranking table with advanced filters and predefined presets.

**Features**:

- Search by name or ticker (300ms debounce)
- Filters: sector, signal, category, valuation
- Score ranges: composite, fundamental, technical
- Advanced filters: Piotroski, margin of safety, data completeness
- Predefined presets (one-click for common configurations)
- Column sorting (toggle ASC/DESC)
- Pagination (50 results per page)
- Guided tour with 9 educational steps
- Contextual helpers on every filter

**Columns**: rank, company (name + ticker + category badge), fundamental score, technical score, composite score, signal, sector.

**Stock categories**: Value (blue), Growth (green), GARP (orange), Speculative (red).

#### 3. Company Detail

Full analysis page with 6 sections navigable via sticky tabs.

**Overview**: company description, business profile.

**Financials**:

- Balance sheet and liquidity (revenue, net income, FCF, equity, liabilities, current ratio, interest coverage, debt/EBITDA)
- 4 interactive charts: historical EPS, revenue vs net income, free cash flow, income breakdown
- Warning banner when data completeness is below 40%

**Valuation**:

- Fair value estimated with 4 methods (DCF, Graham, EPV, P/E-based)
- Margin of safety with visual indicator (green = undervalued, red = overvalued)
- Fair value range (conservative - optimistic estimate)
- Analyst consensus (Strong Buy / Buy / Hold / Sell / Strong Sell)
- Latest earnings surprise
- Valuation metrics (P/E, ROE, P/B, P/FCF, gross margin, ROIC)
- Ratio radar chart
- Fundamental criteria with passed/failed/unavailable detail

**Dividends** (if applicable):

- Dividend yield, DPS, payout ratio, FCF payout
- Dividend growth (5Y CAGR) and consecutive years
- Historical dividend chart

**Technical**:

- Interactive candlestick chart with integrated RSI
- Moving averages chart (SMA 50, SMA 200)
- Technical indicators: RSI, SMA, MACD, momentum, volatility

**Management Quality**:

- Piotroski F-Score (0-9) with breakdown of all 9 criteria
- Earnings quality ratio (OCF/Net Income)
- Share dilution (buyback vs dilution)
- Management signal (strong/neutral/weak)
- Insider transactions (buys, sells, grants)
- Insider sentiment chart

**Governance**: executive team, risk assessment (audit, board, compensation, shareholder rights).

**Educational elements**:

- 15-step guided tour with analytical approach (each step poses a question and explains how to interpret the card)
- Helper (i) icon on every card with detailed explanation
- Integrated glossary on every metric
- CTA to the analysis quiz (`/quiz/[symbol]`)
- Analysis disclaimer at the bottom of the page

#### 4. Analysis Quiz

Standalone page (`/quiz/[symbol]`) with step-by-step navigation that tests the user's understanding of a specific company's analysis.

**Features**:

- 4 thematic steps: Fundamentals, Valuation, Technical Analysis, Management Quality
- Each step shows real company data with related multiple-choice questions
- Forward/backward navigation between steps
- Results screen with per-section and total score
- Answer persistence in localStorage (per symbol)
- Direct link from the company detail page

**Goal**: verify that the user understood the concepts shown in the analysis, turning passive learning into active participation.

#### 5. Stock Comparison

Side-by-side comparison of 2-4 companies with automatic best/worst highlighting for each metric.

**Sections**:

- Overview (category, sector, price, scores, signal, valuation)
- Fundamental metrics (11 metrics with green/red highlighting)
- Valuation (fair value, price, margin of safety, signal, range)
- Overlaid radar chart of profiles
- Normalized price performance (base 100)

**Guided tour** with 8 educational steps focused on relative analysis, margin of safety (Graham), and the "price vs value" concept.

#### 6. Earnings Calendar

Monthly calendar of earnings release dates.

**Features**:

- Calendar view with count badge per day
- Search by name/ticker with results grouped by date
- Side drawer with details: name, ticker, price, scores, signal, timing (pre-market/after-hours)
- Previous/next month navigation
- Educational guided tour ("Prepare, don't react")

#### 7. Dividends Calendar

Calendar of ex-dividend dates with yield analysis.

**Features**:

- Calendar view with green badge for high yield
- Drawer with details: amount per share, yield, annualized yield, frequency, pay date, record date
- "High Yield" badge for yields >= 1% per distribution
- Sort by yield (highest first)
- Educational guided tour ("Quality before yield")

#### 8. IPO Calendar

Calendar of upcoming initial public offerings.

**Features**:

- Calendar view with IPO count per day
- Drawer with details: name, ticker, price range, shares offered, capital raised, status
- Status badge (Filed, Expected, Direct Listing, Rumor, Priced, Withdrawn)
- Educational guided tour ("Patience pays" — quoting Buffett)

---

## Scoring System

### Fundamental Score (0-100)

Automated analysis of 30+ weighted criteria across 9 categories:

| Category | Criteria | Weight |
| -------- | -------- | ------ |
| EPS and growth | EPS trend, EPS CAGR >10%, price CAGR | 1.0 - 2.0 |
| Profitability | ROIC >10%, ROE, return on tangible assets | 1.0 - 2.0 |
| Margins | Gross margin >60%, operating margin >10% | 1.0 - 1.5 |
| Free cash flow | P/FCF <15, positive FCF, CapEx intensity | 1.0 - 2.0 |
| Dividends | Payout ratio <60% | 1.0 |
| Financial strength | D/E <2, current ratio >1.5, interest coverage >3, debt/EBITDA <3 | 1.0 |
| Asset quality | Low dependence on intangibles | 1.0 |
| Valuation | Price < Graham Number, DCF undervalued | 1.0 - 2.0 |
| 5Y growth | Revenue growth >10% | 1.5 |

Missing data does not penalize the score: it is excluded from the calculation and completeness is tracked separately.

### Technical Score (0-100)

Based on 5 indicators: RSI (14), SMA 50/200 (Golden Cross), MACD, momentum (ROC 12M), volatility. Base score of 50 with +/- adjustments for each indicator.

### Composite Score (0-100)

Formula: **(Fundamental x 0.70) + (Technical x 0.30)**

The heavier weight on fundamentals reflects the value investing philosophy: fundamentals determine intrinsic value, technicals help with timing.

### Stock Classification

Each stock is automatically classified into one of 4 categories based on its financial profile: **Value**, **Growth**, **GARP** (Growth at Reasonable Price), **Speculative**. The classification adapts fair value models to the company's profile.

### Fair Value (4 methods)

| Method | Approach | Ideal Use |
| ------ | -------- | --------- |
| DCF | 10-year discounted cash flows (dual-stage) | Companies with positive FCF |
| Graham Number | sqrt(22.5 x EPS x BV per share) | Classic value benchmark |
| EPV | EPS / discount rate | Mature companies, stable growth |
| P/E-based | EPS x sector P/E | Peer group comparison |

The final fair value is a weighted average of valid methods, with a conservative-optimistic range and margin of safety calculated against the current price.

### Quality Metrics

- **Piotroski F-Score** (0-9): 9 binary criteria on profitability, leverage, and operating efficiency
- **Earnings Quality**: OCF/Net Income ratio (>1.0 = high quality)
- **Share Dilution**: % change in shares outstanding (negative = positive buyback)

---

## Data Pipeline

### Data Sources

| Source | Role | Key Data |
| ------ | ---- | -------- |
| Polygon.io | Primary | Financial statements, daily prices (10+ years) |
| Yahoo Finance | Fallback | Company profile, prices, fundamental data |
| Finnhub | Enrichment | Per-share metrics, growth, dividends, beta, insider |

### Multi-source Strategy

Each data point is first looked up on Polygon, then Yahoo (two different endpoints), then Finnhub. The pipeline only accepts usable data (not simply non-null) and tracks the resulting completeness.

### Scheduling

| Task | Frequency | Purpose |
| ---- | --------- | ------- |
| Full analysis | Daily (01:00 UTC) | Update all tickers |
| Retry failures | Hourly | Recover tickers with errors |
| Watchdog | Every 5 minutes | Detect stalled pipelines |
| IPO report | Monday 08:00 UTC | Weekly summary via Telegram |

---

## Educational Elements

### Guided Tours

Each main page has an interactive tour (Driver.js). On page load, a non-intrusive popup invites the user to start the tour, with a "don't ask me again" option (global persistence in localStorage). The tour can also be started manually via the dedicated button in the navigation.

| Page | Steps | Educational Focus |
| ---- | ----- | ----------------- |
| Company detail | 15 | Complete analysis: from balance sheet to governance |
| Screener | 9 | How to filter and interpret rankings |
| Comparison | 8 | Relative analysis, margin of safety, price vs value |
| Earnings | 5 | Why monitor earnings, prepare before the market |
| Dividends | 4 | Dividend sustainability, quality > yield |
| IPO | 4 | IPO caution, patience as a strategy |

### Contextual Helpers

Info (i) icons placed next to every card and metric, with explanations of meaning and interpretation from a value investing perspective.

### Integrated Glossary

Tooltips on every financial term (P/E, ROE, DCF, margin of safety, etc.) with definitions and reference thresholds.

### Disclaimer

Educational messages present on all pages that emphasize:

- The platform is purely educational
- Data may be incomplete
- It does not constitute financial advice
- Users should conduct their own analysis

---

## Tech Stack

| Component | Technology |
| --------- | ---------- |
| Frontend | Nuxt 4.3, Vue 3, TypeScript, Tailwind CSS 4.1 |
| UI Kit | Nuxt UI (UCard, UBadge, UButton, USlideover, etc.) |
| Charts | Chart.js (financial), Lightweight Charts (candlestick) |
| Tour | Driver.js |
| Backend | Nitro (Nuxt server), Drizzle ORM |
| Database | PostgreSQL 17 |
| Runtime | Node 22 LTS, pnpm |
| Deploy | Docker multi-stage, GitHub Actions CI/CD |

---

## Evolution Opportunities

### Short-term features

- Personal watchlist with notifications
- Sector benchmark comparison
- Historical score tracking per ticker
- Analysis export to PDF

### Medium-term features

- User accounts with preference saving
- Educational portfolio tracker (simulation without real money)
- Structured value investing lessons integrated into the platform
- Community-level analysis and verdict sharing

### Market expansion

- European exchange support (Euronext, XETRA)
- Milan Stock Exchange support (FTSE MIB)
- Spanish and German language support

### Potential monetization

- Freemium model (free basic screener, full detail premium)
- Subscription for personalized notifications (earnings, dividends, fair value reached)
- Value investing courses integrated into the platform
- API access for developers and analysts
