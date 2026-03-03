// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@scalar/nuxt',
    '@nuxtjs/i18n'
  ],

  i18n: {
    locales: [
      {
        code: 'en',
        language: 'en-US',
        name: 'English',
        files: ['en/common.json', 'en/home.json', 'en/stocks.json', 'en/company.json', 'en/calendar.json', 'en/helpers.json', 'en/tour.json', 'en/quiz.json', 'en/landing.json', 'en/screener.json', 'en/compare.json', 'en/glossary.json']
      },
      {
        code: 'it',
        language: 'it-IT',
        name: 'Italiano',
        files: ['it/common.json', 'it/home.json', 'it/stocks.json', 'it/company.json', 'it/calendar.json', 'it/helpers.json', 'it/tour.json', 'it/quiz.json', 'it/landing.json', 'it/screener.json', 'it/compare.json', 'it/glossary.json']
      }
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_lang',
      redirectOn: 'root'
    }
  },

  scalar: {
    defaultHttpClient: {
      targetKey: 'node',
      clientKey: 'fetch'
    }
  },

  colorMode: {
    preference: 'system'
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/stocks_radar',
    polygonApiKey1: process.env.POLYGON_API_KEY1 || '',
    polygonApiKey2: process.env.POLYGON_API_KEY2 || '',
    polygonApiKey3: process.env.POLYGON_API_KEY3 || '',
    polygonApiKey4: process.env.POLYGON_API_KEY4 || '',
    polygonApiKey5: process.env.POLYGON_API_KEY5 || '',
    finnhubApiKey1: process.env.FINNHUB_API_KEY1 || '',
    finnhubApiKey2: process.env.FINNHUB_API_KEY2 || '',
    finnhubApiKey3: process.env.FINNHUB_API_KEY3 || '',
    finnhubApiKey4: process.env.FINNHUB_API_KEY4 || '',
    finnhubApiKey5: process.env.FINNHUB_API_KEY5 || '',
    finnhubApiKey6: process.env.FINNHUB_API_KEY6 || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    public: {
      externalNewsUrl: process.env.NUXT_PUBLIC_EXTERNAL_NEWS_URL || ''
    }
  },

  nitro: {
    experimental: {
      tasks: true,
      openAPI: true
    },
    openAPI: {
      meta: {
        title: 'Stocks Radar API',
        description: 'Value investing analysis API for NASDAQ large-cap stocks',
        version: '1.0.0'
      }
    },
    scheduledTasks: {
      // Daily at 01:00 UTC (after US market close)
      '0 1 * * *': ['analysis:run'],
      // Every hour - retry failed tickers from latest run
      '0 * * * *': ['analysis:retry'],
      // Every 5 minutes - detect stalled pipelines, alert via Telegram, restart
      '*/5 * * * *': ['analysis:watchdog'],
      // Every Monday at 08:00 UTC - IPO calendar summary via Telegram
      '0 8 * * 1': ['ipo:notify']
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
