# Stocks Radar - Feature Roadmap

## Phase 1: Analysis & Comparison

### 1. Stock Screener

Dedicated page with filters to explore the universe of analyzed stocks. Filters for:

- Category (value/growth/garp/speculative)
- Composite score range
- Sector / industry
- Margin of safety (% undervalued)
- Piotroski F-Score
- Fundamental / technical / valuation signal
- Minimum data completeness

Educational goal: teach users to narrow the investment universe like an analyst, starting from quantitative criteria.

**Status:** Implemented

---

### 2. Stock Comparison

Side-by-side comparison page for 2-4 selected tickers. Shows:

- Fundamental metrics side by side (P/E, P/B, ROE, margins, growth)
- Fair value and margin of safety comparison
- Scores and classification
- Overlaid price chart
- Comparative radar chart

Educational goal: understand the differences between stock categories in practice, compare investment alternatives.

**Status:** Implemented

---

### 3. Peer Comparison

In the ticker detail page, a section that automatically compares the stock with peers in its sector/industry:

- P/E vs sector average
- Margins vs peers
- Growth vs peers
- Position in sector ranking

Educational goal: contextualize the numbers. A P/E of 25 is high for a utility but low for tech.

**Status:** To implement

---

## Phase 2: Tracking & Monitoring

### 4. Personal Watchlist

Feature to save tickers of interest (localStorage or DB):

- List of "followed" stocks with personal notes
- Dedicated dashboard with score and fair value changes
- Quick view of changes since last visit

Educational goal: first step toward building a disciplined investment process.

**Status:** To implement

---

### 5. Historical Scores

Chart of temporal evolution for each ticker:

- Composite score over time
- Fair value vs price over time
- Margin of safety over time
- Classification changes

Requires saving historical analysis results (new DB table).

Educational goal: show that fundamental analysis is not static — values change over time.

**Status:** To implement

---

### 6. Custom Alerts

User-configurable Telegram notifications:

- Stock enters "buy zone" (margin of safety > X%)
- Composite score exceeds threshold
- Piotroski F-Score > 7
- Classification change (e.g., from GARP to Value)
- Fair value changes significantly

Educational goal: define your purchase criteria in advance.

**Status:** To implement

---

## Phase 3: Education

### 7. Interactive Analysis Checklist

Step-by-step guide the user fills out for each stock:

- "Have you checked the debt level?"
- "Is Free Cash Flow positive and growing?"
- "Is the price below the estimated fair value?"
- "Is the Piotroski F-Score at least 6?"
- At the end: summary of your own analysis with a conclusion

Educational goal: provide a structured framework for making investment decisions.

**Status:** Implemented

---

### 8. Visual Score Breakdown

In the detail page, interactive breakdown of the composite score:

- Which criteria contributed positively (green)
- Which negatively (red)
- Which are missing (gray)
- Weight of each criterion in the formula

The data is already available in `reasons.passed/failed/unavailable`.

Educational goal: full transparency on the "why" behind every score.

**Status:** Implemented

---

### 9. Contextual Glossary

Popup/tooltip on financial terms with:

- Simple definition
- Practical example
- Reference thresholds ("a P/E below 15 is generally considered cheap")

Can be integrated into the existing InfoHelper or as a standalone component.

Educational goal: make financial concepts accessible without leaving the platform.

**Status:** Implemented

---

## Phase 4: Advanced Analysis

### 10. Dividend Analysis

Dedicated section in fundamental analysis:

- Dividend growth (5Y, 10Y CAGR)
- Payout ratio sustainability
- Dividend yield vs sector average
- Consecutive increase streak

Educational goal: understand the difference between high yield and sustainable dividends.

**Status:** Implemented

---

### 11. Management Quality

Insider trading data integration (Finnhub endpoint available):

- Recent insider buying/selling
- Buyback vs dilution (already tracked)
- Capital allocation history

Educational goal: evaluate whether management acts in shareholders' interest.

**Status:** Implemented

---

### 12. Sector Heatmap

Aggregated sector view in the dashboard:

- Color map for average sector valuation
- Concentration of undervalued stocks per sector
- Sector trend

Educational goal: macro view before drilling down into individual stock analysis.

**Status:** To implement
