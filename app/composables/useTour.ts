import type { DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { createBullDriver } from './useBullTourDriver'

const STEP_KEYS = [
  'welcome', 'overview', 'balanceSheet', 'revenue', 'fcf', 'currentRatio',
  'debtMetrics', 'epsChart', 'revenueChart', 'fcfChart', 'incomeBreakdown',
  'fairValue', 'marginOfSafety', 'peRatio', 'roeRoic', 'pbPfcf',
  'radarChart', 'fundamentalCriteria', 'priceChart', 'rsi', 'smaTrend',
  'macdVolatility', 'piotroski', 'earningsQuality', 'shareDilution',
  'governance', 'conclusion'
] as const

export function useTour() {
  const { t } = useI18n()

  function startTour() {
    const steps: DriveStep[] = [
      {
        popover: {
          title: t('tour.welcome.title'),
          description: t('tour.welcome.description')
        }
      },
      {
        element: '[data-tour="overview"]',
        popover: {
          title: t('tour.overview.title'),
          description: t('tour.overview.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="balance-sheet"]',
        popover: {
          title: t('tour.balanceSheet.title'),
          description: t('tour.balanceSheet.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="metric-revenue"]',
        popover: {
          title: t('tour.revenue.title'),
          description: t('tour.revenue.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="metric-fcf"]',
        popover: {
          title: t('tour.fcf.title'),
          description: t('tour.fcf.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="metric-current-ratio"]',
        popover: {
          title: t('tour.currentRatio.title'),
          description: t('tour.currentRatio.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="metric-debt-ebitda"]',
        popover: {
          title: t('tour.debtMetrics.title'),
          description: t('tour.debtMetrics.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="eps-chart"]',
        popover: {
          title: t('tour.epsChart.title'),
          description: t('tour.epsChart.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-tour="revenue-chart"]',
        popover: {
          title: t('tour.revenueChart.title'),
          description: t('tour.revenueChart.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-tour="fcf-chart"]',
        popover: {
          title: t('tour.fcfChart.title'),
          description: t('tour.fcfChart.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-tour="income-breakdown"]',
        popover: {
          title: t('tour.incomeBreakdown.title'),
          description: t('tour.incomeBreakdown.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-tour="fair-value"]',
        popover: {
          title: t('tour.fairValue.title'),
          description: t('tour.fairValue.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="metric-margin-of-safety"]',
        popover: {
          title: t('tour.marginOfSafety.title'),
          description: t('tour.marginOfSafety.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="metric-pe"]',
        popover: {
          title: t('tour.peRatio.title'),
          description: t('tour.peRatio.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="metric-roe"]',
        popover: {
          title: t('tour.roeRoic.title'),
          description: t('tour.roeRoic.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="metric-pb"]',
        popover: {
          title: t('tour.pbPfcf.title'),
          description: t('tour.pbPfcf.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="radar-chart"]',
        popover: {
          title: t('tour.radarChart.title'),
          description: t('tour.radarChart.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-tour="fundamental-criteria"]',
        popover: {
          title: t('tour.fundamentalCriteria.title'),
          description: t('tour.fundamentalCriteria.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-tour="price-chart"]',
        popover: {
          title: t('tour.priceChart.title'),
          description: t('tour.priceChart.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="metric-rsi"]',
        popover: {
          title: t('tour.rsi.title'),
          description: t('tour.rsi.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="sma-chart"]',
        popover: {
          title: t('tour.smaTrend.title'),
          description: t('tour.smaTrend.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-tour="metric-macd"]',
        popover: {
          title: t('tour.macdVolatility.title'),
          description: t('tour.macdVolatility.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="piotroski"]',
        popover: {
          title: t('tour.piotroski.title'),
          description: t('tour.piotroski.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="earnings-quality"]',
        popover: {
          title: t('tour.earningsQuality.title'),
          description: t('tour.earningsQuality.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-tour="share-dilution"]',
        popover: {
          title: t('tour.shareDilution.title'),
          description: t('tour.shareDilution.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-tour="governance"]',
        popover: {
          title: t('tour.governance.title'),
          description: t('tour.governance.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        popover: {
          title: t('tour.conclusion.title'),
          description: t('tour.conclusion.description')
        }
      }
    ]

    const quips = STEP_KEYS.map(key => t(`tour.bullQuips.${key}`))

    const driverObj = createBullDriver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: 'black',
      overlayOpacity: 0.6,
      stagePadding: 10,
      stageRadius: 8,
      nextBtnText: t('tour.next'),
      prevBtnText: t('tour.prev'),
      doneBtnText: t('tour.done'),
      progressText: '{{current}} / {{total}}',
      steps
    }, quips)

    driverObj.drive()
  }

  return { startTour }
}
