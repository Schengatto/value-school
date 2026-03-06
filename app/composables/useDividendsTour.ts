import type { DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { createSageDriver } from './useSageTourDriver'

const STEP_KEYS = ['welcome', 'calendar', 'detail', 'conclusion'] as const

export function useDividendsTour() {
  const { t } = useI18n()

  function startTour() {
    const steps: DriveStep[] = [
      {
        popover: {
          title: t('dividends.tour.welcome.title'),
          description: t('dividends.tour.welcome.description')
        }
      },
      {
        element: '[data-tour="dividends-calendar"]',
        popover: {
          title: t('dividends.tour.calendar.title'),
          description: t('dividends.tour.calendar.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        popover: {
          title: t('dividends.tour.detail.title'),
          description: t('dividends.tour.detail.description')
        }
      },
      {
        popover: {
          title: t('dividends.tour.conclusion.title'),
          description: t('dividends.tour.conclusion.description')
        }
      }
    ]

    const quips = STEP_KEYS.map(key => t(`dividends.tour.sageQuips.${key}`))

    const driverObj = createSageDriver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: 'black',
      overlayOpacity: 0.6,
      stagePadding: 10,
      stageRadius: 8,
      nextBtnText: t('dividends.tour.next'),
      prevBtnText: t('dividends.tour.prev'),
      doneBtnText: t('dividends.tour.done'),
      progressText: '{{current}} / {{total}}',
      steps
    }, quips)

    driverObj.drive()
  }

  return { startTour }
}
