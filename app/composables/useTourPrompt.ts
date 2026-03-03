const PROMPT_DISMISSED_KEY = 'stocks-radar:tour-prompt-dismissed'

/**
 * Shared tour prompt logic. Uses a single localStorage key so dismissing
 * on any page applies globally (user said "don't ask me again").
 */
export function useTourPrompt() {
  const showPrompt = ref(false)
  const dontAskAgain = ref(false)

  onMounted(() => {
    try {
      if (!localStorage.getItem(PROMPT_DISMISSED_KEY)) {
        showPrompt.value = true
      }
    } catch { /* ignore */ }
  })

  function dismissPrompt() {
    showPrompt.value = false
    if (dontAskAgain.value) {
      try { localStorage.setItem(PROMPT_DISMISSED_KEY, '1') } catch { /* ignore */ }
    }
  }

  function startAndDismiss(startFn: () => void) {
    showPrompt.value = false
    startFn()
  }

  return { showPrompt, dontAskAgain, dismissPrompt, startAndDismiss }
}
