import type { DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { createBullDriver } from './useBullTourDriver'

const STEP_KEYS = ['welcome', 'calendar', 'detail', 'conclusion'] as const

export function useIpoTour() {
  const { t } = useI18n()

  function startTour() {
    const steps: DriveStep[] = [
      {
        popover: {
          title: t('ipo.tour.welcome.title'),
          description: t('ipo.tour.welcome.description')
        }
      },
      {
        element: '[data-tour="ipo-calendar"]',
        popover: {
          title: t('ipo.tour.calendar.title'),
          description: t('ipo.tour.calendar.description'),
          side: 'top',
          align: 'start'
        }
      },
      {
        popover: {
          title: t('ipo.tour.detail.title'),
          description: t('ipo.tour.detail.description')
        }
      },
      {
        popover: {
          title: t('ipo.tour.conclusion.title'),
          description: t('ipo.tour.conclusion.description')
        }
      }
    ]

    const quips = STEP_KEYS.map(key => t(`ipo.tour.bullQuips.${key}`))

    const driverObj = createBullDriver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: 'black',
      overlayOpacity: 0.6,
      stagePadding: 10,
      stageRadius: 8,
      nextBtnText: t('ipo.tour.next'),
      prevBtnText: t('ipo.tour.prev'),
      doneBtnText: t('ipo.tour.done'),
      progressText: '{{current}} / {{total}}',
      steps
    }, quips)

    driverObj.drive()
  }

  return { startTour }
}
