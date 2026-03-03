import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

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
      nextBtnText: t('ipo.tour.next'),
      prevBtnText: t('ipo.tour.prev'),
      doneBtnText: t('ipo.tour.done'),
      progressText: '{{current}} / {{total}}',
      steps
    })

    driverObj.drive()
  }

  return { startTour }
}
