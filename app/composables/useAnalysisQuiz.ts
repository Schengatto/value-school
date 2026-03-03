import type { ComputedRef } from 'vue'

interface QuizQuestion {
  id: string
  section: 'financials' | 'valuation' | 'technical' | 'management'
  question: string
  options: { key: string, label: string }[]
  correctKey: string
  explanation: string
}

interface QuizAnswer {
  selected: string
  correct: boolean
}

const STORAGE_PREFIX = 'stocks-radar:quiz:'

export function useAnalysisQuiz(symbol: string, stock: ComputedRef<Record<string, any> | null>) {
  const { t } = useI18n()

  const storageKey = `${STORAGE_PREFIX}${symbol}`

  const savedState = ref<{ answers: Record<string, QuizAnswer> }>({
    answers: {}
  })

  onMounted(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) savedState.value = JSON.parse(raw)
    } catch { /* ignore */ }
  })

  function persist() {
    localStorage.setItem(storageKey, JSON.stringify(savedState.value))
  }

  const questions = computed<QuizQuestion[]>(() => {
    const s = stock.value
    if (!s) return []

    const qs: QuizQuestion[] = []
    const td = s.technicalData as any

    if (s.currentRatio != null) {
      const val = s.currentRatio as number
      const correct = val >= 1.5 ? 'a' : val >= 1.0 ? 'b' : 'c'
      qs.push({
        id: 'currentRatio',
        section: 'financials',
        question: t('quiz.questions.currentRatio.question', { value: val.toFixed(2) }),
        options: [
          { key: 'a', label: t('quiz.questions.currentRatio.a') },
          { key: 'b', label: t('quiz.questions.currentRatio.b') },
          { key: 'c', label: t('quiz.questions.currentRatio.c') }
        ],
        correctKey: correct,
        explanation: t('quiz.questions.currentRatio.explanation')
      })
    }

    if (s.debtToEbitda != null) {
      const val = s.debtToEbitda as number
      const correct = val <= 3 ? 'a' : val <= 5 ? 'b' : 'c'
      qs.push({
        id: 'debtToEbitda',
        section: 'financials',
        question: t('quiz.questions.debtToEbitda.question', { value: val.toFixed(2) }),
        options: [
          { key: 'a', label: t('quiz.questions.debtToEbitda.a') },
          { key: 'b', label: t('quiz.questions.debtToEbitda.b') },
          { key: 'c', label: t('quiz.questions.debtToEbitda.c') }
        ],
        correctKey: correct,
        explanation: t('quiz.questions.debtToEbitda.explanation')
      })
    }

    if (s.freeCashFlow != null) {
      const val = s.freeCashFlow as number
      const correct = val > 0 ? 'a' : 'b'
      qs.push({
        id: 'fcf',
        section: 'financials',
        question: t('quiz.questions.fcf.question', { value: val >= 1e9 ? `$${(val / 1e9).toFixed(1)}B` : val >= 1e6 ? `$${(val / 1e6).toFixed(0)}M` : `$${val.toLocaleString()}` }),
        options: [
          { key: 'a', label: t('quiz.questions.fcf.a') },
          { key: 'b', label: t('quiz.questions.fcf.b') },
          { key: 'c', label: t('quiz.questions.fcf.c') }
        ],
        correctKey: correct,
        explanation: t('quiz.questions.fcf.explanation')
      })
    }

    if (s.pe != null) {
      const val = s.pe as number
      const correct = val < 0 ? 'c' : val <= 15 ? 'a' : val <= 25 ? 'b' : 'c'
      qs.push({
        id: 'pe',
        section: 'valuation',
        question: t('quiz.questions.pe.question', { value: val.toFixed(1) }),
        options: [
          { key: 'a', label: t('quiz.questions.pe.a') },
          { key: 'b', label: t('quiz.questions.pe.b') },
          { key: 'c', label: t('quiz.questions.pe.c') }
        ],
        correctKey: correct,
        explanation: t('quiz.questions.pe.explanation')
      })
    }

    if (s.marginOfSafety != null) {
      const val = s.marginOfSafety as number
      const correct = val >= 25 ? 'a' : val >= 0 ? 'b' : 'c'
      qs.push({
        id: 'marginOfSafety',
        section: 'valuation',
        question: t('quiz.questions.marginOfSafety.question', { value: `${val > 0 ? '+' : ''}${val.toFixed(1)}%` }),
        options: [
          { key: 'a', label: t('quiz.questions.marginOfSafety.a') },
          { key: 'b', label: t('quiz.questions.marginOfSafety.b') },
          { key: 'c', label: t('quiz.questions.marginOfSafety.c') }
        ],
        correctKey: correct,
        explanation: t('quiz.questions.marginOfSafety.explanation')
      })
    }

    if (s.fairValue != null && s.currentPrice != null) {
      const fv = s.fairValue as number
      const cp = s.currentPrice as number
      const correct = cp < fv ? 'a' : cp > fv * 1.1 ? 'c' : 'b'
      qs.push({
        id: 'fairValueVsPrice',
        section: 'valuation',
        question: t('quiz.questions.fairValueVsPrice.question', { fairValue: `$${fv.toFixed(2)}`, price: `$${cp.toFixed(2)}` }),
        options: [
          { key: 'a', label: t('quiz.questions.fairValueVsPrice.a') },
          { key: 'b', label: t('quiz.questions.fairValueVsPrice.b') },
          { key: 'c', label: t('quiz.questions.fairValueVsPrice.c') }
        ],
        correctKey: correct,
        explanation: t('quiz.questions.fairValueVsPrice.explanation')
      })
    }

    if (td?.rsi14 != null) {
      const val = td.rsi14 as number
      const correct = val < 30 ? 'a' : val > 70 ? 'c' : 'b'
      qs.push({
        id: 'rsi',
        section: 'technical',
        question: t('quiz.questions.rsi.question', { value: val.toFixed(1) }),
        options: [
          { key: 'a', label: t('quiz.questions.rsi.a') },
          { key: 'b', label: t('quiz.questions.rsi.b') },
          { key: 'c', label: t('quiz.questions.rsi.c') }
        ],
        correctKey: correct,
        explanation: t('quiz.questions.rsi.explanation')
      })
    }

    if (td?.sma50 != null && td?.sma200 != null) {
      const sma50 = td.sma50 as number
      const sma200 = td.sma200 as number
      const correct = sma50 > sma200 ? 'a' : 'b'
      qs.push({
        id: 'smaTrend',
        section: 'technical',
        question: t('quiz.questions.smaTrend.question', { sma50: `$${sma50.toFixed(2)}`, sma200: `$${sma200.toFixed(2)}` }),
        options: [
          { key: 'a', label: t('quiz.questions.smaTrend.a') },
          { key: 'b', label: t('quiz.questions.smaTrend.b') },
          { key: 'c', label: t('quiz.questions.smaTrend.c') }
        ],
        correctKey: correct,
        explanation: t('quiz.questions.smaTrend.explanation')
      })
    }

    if (s.piotroskiScore != null) {
      const val = s.piotroskiScore as number
      const correct = val >= 7 ? 'a' : val >= 4 ? 'b' : 'c'
      qs.push({
        id: 'piotroski',
        section: 'management',
        question: t('quiz.questions.piotroski.question', { value: val }),
        options: [
          { key: 'a', label: t('quiz.questions.piotroski.a') },
          { key: 'b', label: t('quiz.questions.piotroski.b') },
          { key: 'c', label: t('quiz.questions.piotroski.c') }
        ],
        correctKey: correct,
        explanation: t('quiz.questions.piotroski.explanation')
      })
    }

    if (s.earningsQuality != null) {
      const val = s.earningsQuality as number
      const correct = val >= 1.0 ? 'a' : val >= 0.5 ? 'b' : 'c'
      qs.push({
        id: 'earningsQuality',
        section: 'management',
        question: t('quiz.questions.earningsQuality.question', { value: val.toFixed(2) }),
        options: [
          { key: 'a', label: t('quiz.questions.earningsQuality.a') },
          { key: 'b', label: t('quiz.questions.earningsQuality.b') },
          { key: 'c', label: t('quiz.questions.earningsQuality.c') }
        ],
        correctKey: correct,
        explanation: t('quiz.questions.earningsQuality.explanation')
      })
    }

    return qs
  })

  function questionsForSection(section: string) {
    return computed(() => questions.value.filter(q => q.section === section))
  }

  const answers = computed(() => savedState.value.answers)

  function answerQuestion(questionId: string, selected: string) {
    const q = questions.value.find(q => q.id === questionId)
    if (!q || savedState.value.answers[questionId]) return
    savedState.value.answers[questionId] = {
      selected,
      correct: selected === q.correctKey
    }
    persist()
  }

  const progress = computed(() => {
    const total = questions.value.length
    const answered = Object.keys(savedState.value.answers).length
    const correct = Object.values(savedState.value.answers).filter(a => a.correct).length
    return { total, answered, correct }
  })

  function resetQuiz() {
    savedState.value = { answers: {} }
    persist()
  }

  return {
    questions,
    questionsForSection,
    answers,
    answerQuestion,
    progress,
    resetQuiz
  }
}
