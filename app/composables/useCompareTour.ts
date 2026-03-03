import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

export function useCompareTour() {
  const { t } = useI18n()

  function driverConfig(steps: DriveStep[]) {
    return driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: 'black',
      overlayOpacity: 0.6,
      stagePadding: 10,
      stageRadius: 8,
      popoverClass: 'tour-popover',
      nextBtnText: t('compare.tour.next'),
      prevBtnText: t('compare.tour.prev'),
      doneBtnText: t('compare.tour.done'),
      progressText: '{{current}} / {{total}}',
      steps
    })
  }

  const introSteps: () => DriveStep[] = () => [
    {
      popover: {
        title: t('compare.tour.intro.title'),
        description: t('compare.tour.intro.description')
      }
    },
    {
      element: '[data-tour="stock-selector"]',
      popover: {
        title: t('compare.tour.selector.title'),
        description: t('compare.tour.selector.description'),
        side: 'bottom',
        align: 'start'
      }
    }
  ]

  const analysisSteps: () => DriveStep[] = () => [
    {
      element: '[data-tour="compare-overview"]',
      popover: {
        title: t('compare.tour.overview.title'),
        description: t('compare.tour.overview.description'),
        side: 'bottom',
        align: 'start'
      }
    },
    {
      element: '[data-tour="compare-fundamentals"]',
      popover: {
        title: t('compare.tour.fundamentals.title'),
        description: t('compare.tour.fundamentals.description'),
        side: 'top',
        align: 'start'
      }
    },
    {
      element: '[data-tour="compare-valuation"]',
      popover: {
        title: t('compare.tour.valuation.title'),
        description: t('compare.tour.valuation.description'),
        side: 'top',
        align: 'start'
      }
    },
    {
      element: '[data-tour="compare-radar"]',
      popover: {
        title: t('compare.tour.radar.title'),
        description: t('compare.tour.radar.description'),
        side: 'top',
        align: 'start'
      }
    },
    {
      element: '[data-tour="compare-price"]',
      popover: {
        title: t('compare.tour.price.title'),
        description: t('compare.tour.price.description'),
        side: 'top',
        align: 'start'
      }
    },
    {
      popover: {
        title: t('compare.tour.conclusion.title'),
        description: t('compare.tour.conclusion.description')
      }
    }
  ]

  function startTour() {
    driverConfig([...introSteps(), ...analysisSteps()]).drive()
  }

  return { startTour }
}
