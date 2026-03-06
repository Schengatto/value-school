import type { DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { createSageDriver } from './useSageTourDriver'

const STEP_KEYS = ['welcome', 'search', 'calendar', 'detail', 'conclusion'] as const

export function useEarningsTour() {
  const { t } = useI18n()

  function startTour() {
    const steps: DriveStep[] = [
      {
        popover: {
          title: t('earnings.tour.welcome.title'),
          description: t('earnings.tour.welcome.description')
        }
      },
      {
        element: '[data-tour="earnings-search"]',
        popover: {
          title: t('earnings.tour.search.title'),
          description: t('earnings.tour.search.description'),
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '[data-tour="earnings-calendar"]',
        popover: {
          title: t('earnings.tour.calendar.title'),
          description: t('earnings.tour.calendar.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        popover: {
          title: t('earnings.tour.detail.title'),
          description: t('earnings.tour.detail.description')
        }
      },
      {
        popover: {
          title: t('earnings.tour.conclusion.title'),
          description: t('earnings.tour.conclusion.description')
        }
      }
    ]

    const quips = STEP_KEYS.map(key => t(`earnings.tour.sageQuips.${key}`))

    const driverObj = createSageDriver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: 'black',
      overlayOpacity: 0.6,
      stagePadding: 10,
      stageRadius: 8,
      nextBtnText: t('earnings.tour.next'),
      prevBtnText: t('earnings.tour.prev'),
      doneBtnText: t('earnings.tour.done'),
      progressText: '{{current}} / {{total}}',
      steps
    }, quips)

    driverObj.drive()
  }

  return { startTour }
}
