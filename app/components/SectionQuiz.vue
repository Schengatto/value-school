<script setup lang="ts">
const props = defineProps<{
  sectionKey: string
  questions: { id: string, question: string, options: { key: string, label: string }[], correctKey: string, explanation: string }[]
  answers: Record<string, { selected: string, correct: boolean }>
}>()

const emit = defineEmits<{
  answer: [questionId: string, selected: string]
}>()

const isOpen = ref(true)

const sectionScore = computed(() => {
  const sectionAnswers = props.questions.filter(q => props.answers[q.id])
  if (sectionAnswers.length === 0) return null
  const correct = sectionAnswers.filter(q => props.answers[q.id]?.correct).length
  return { correct, total: props.questions.length, complete: sectionAnswers.length === props.questions.length }
})
</script>

<template>
  <UCard v-if="questions.length > 0" class="border-dashed border-blue-200 dark:border-blue-800">
    <template #header>
      <button class="flex items-center justify-between w-full" @click="isOpen = !isOpen">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-brain" class="text-blue-500" />
          <h4 class="font-semibold text-sm">{{ $t('quiz.sectionTitle') }}</h4>
          <UBadge v-if="sectionScore?.complete" :color="sectionScore.correct === sectionScore.total ? 'success' : 'warning'" variant="subtle" size="xs">
            {{ sectionScore.correct }}/{{ sectionScore.total }}
          </UBadge>
        </div>
        <UIcon :name="isOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="text-gray-400" />
      </button>
    </template>

    <div v-if="isOpen" class="space-y-4">
      <div v-for="q in questions" :key="q.id" class="border border-gray-100 dark:border-gray-800 rounded-lg p-3">
        <p class="text-sm font-medium mb-2">{{ q.question }}</p>
        <div class="space-y-1.5">
          <button
            v-for="opt in q.options"
            :key="opt.key"
            class="w-full text-left text-sm px-3 py-2 rounded-md transition-colors flex items-center gap-2"
            :class="[
              !answers[q.id] ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' : 'cursor-default',
              answers[q.id]?.selected === opt.key && answers[q.id]?.correct ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400' : '',
              answers[q.id]?.selected === opt.key && !answers[q.id]?.correct ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : '',
              answers[q.id] && opt.key === q.correctKey && answers[q.id]?.selected !== opt.key ? 'bg-green-50/50 dark:bg-green-950/20 text-green-600 dark:text-green-500' : ''
            ]"
            :disabled="!!answers[q.id]"
            @click="emit('answer', q.id, opt.key)"
          >
            <span class="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-xs"
              :class="[
                !answers[q.id] ? 'border-gray-300 dark:border-gray-600' : '',
                answers[q.id]?.selected === opt.key && answers[q.id]?.correct ? 'border-green-500 bg-green-500 text-white' : '',
                answers[q.id]?.selected === opt.key && !answers[q.id]?.correct ? 'border-red-500 bg-red-500 text-white' : '',
                answers[q.id] && opt.key === q.correctKey && answers[q.id]?.selected !== opt.key ? 'border-green-500 bg-green-100 dark:bg-green-900' : ''
              ]"
            >
              <UIcon v-if="answers[q.id]?.selected === opt.key && answers[q.id]?.correct" name="i-lucide-check" />
              <UIcon v-else-if="answers[q.id]?.selected === opt.key && !answers[q.id]?.correct" name="i-lucide-x" />
            </span>
            {{ opt.label }}
          </button>
        </div>
        <p v-if="answers[q.id]" class="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2">
          {{ q.explanation }}
        </p>
      </div>
    </div>
  </UCard>
</template>
