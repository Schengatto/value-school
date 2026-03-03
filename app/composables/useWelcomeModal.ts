const WELCOME_SEEN_KEY = 'stocks-radar:welcome-seen'

export function useWelcomeModal() {
  const showWelcome = ref(false)

  onMounted(() => {
    try {
      if (!localStorage.getItem(WELCOME_SEEN_KEY)) {
        showWelcome.value = true
      }
    }
    catch { /* SSR or localStorage unavailable */ }
  })

  function completeWelcome() {
    showWelcome.value = false
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, '1')
    }
    catch { /* ignore */ }
  }

  return { showWelcome, completeWelcome }
}
