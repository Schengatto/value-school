import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

export function useScreenerTour() {
  const { t } = useI18n()

  function startScreenerTour() {
    const steps: DriveStep[] = [
      {
        popover: {
          title: t('screenerTour.welcome.title'),
          description: t('screenerTour.welcome.description')
        }
      },
      {
        element: '[data-tour="screener-intro"]',
        popover: {
          title: t('screenerTour.intro.title'),
          description: t('screenerTour.intro.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="screener-presets"]',
        popover: {
          title: t('screenerTour.presets.title'),
          description: t('screenerTour.presets.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="screener-filters"]',
        popover: {
          title: t('screenerTour.filters.title'),
          description: t('screenerTour.filters.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="screener-score-ranges"]',
        popover: {
          title: t('screenerTour.scoreRanges.title'),
          description: t('screenerTour.scoreRanges.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-tour="screener-advanced"]',
        popover: {
          title: t('screenerTour.advanced.title'),
          description: t('screenerTour.advanced.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '[data-tour="screener-sort"]',
        popover: {
          title: t('screenerTour.sorting.title'),
          description: t('screenerTour.sorting.description'),
          side: 'bottom',
          align: 'end'
        }
      },
      {
        element: '[data-tour="screener-results"]',
        popover: {
          title: t('screenerTour.results.title'),
          description: t('screenerTour.results.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        popover: {
          title: t('screenerTour.conclusion.title'),
          description: t('screenerTour.conclusion.description')
        }
      }
    ]

    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: 'black',
      overlayOpacity: 0.6,
      stagePadding: 10,
      stageRadius: 8,
      popoverClass: 'tour-popover',
      nextBtnText: t('tour.next'),
      prevBtnText: t('tour.prev'),
      doneBtnText: t('tour.done'),
      progressText: '{{current}} / {{total}}',
      steps
    })

    driverObj.drive()
  }

  return { startScreenerTour }
}
