<script setup lang="ts">
withDefaults(defineProps<{
  state?: 'idle' | 'talking' | 'happy' | 'thinking'
  size?: number
}>(), {
  state: 'idle',
  size: 64
})
</script>

<template>
  <div
    class="bull-mascot inline-block"
    :class="[`bull-${state}`]"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="w-full h-full drop-shadow-md"
    >
      <!-- Left horn -->
      <path
        d="M25 38 L12 18 Q10 14 14 16 L28 32"
        class="fill-amber-600 dark:fill-amber-500"
        stroke-width="1"
        class-stroke="stroke-amber-700 dark:stroke-amber-600"
      />
      <!-- Right horn -->
      <path
        d="M75 38 L88 18 Q90 14 86 16 L72 32"
        class="fill-amber-600 dark:fill-amber-500"
        stroke-width="1"
      />

      <!-- Left ear -->
      <ellipse cx="22" cy="42" rx="8" ry="5" transform="rotate(-20 22 42)" class="fill-orange-300 dark:fill-orange-400" />
      <!-- Right ear -->
      <ellipse cx="78" cy="42" rx="8" ry="5" transform="rotate(20 78 42)" class="fill-orange-300 dark:fill-orange-400" />

      <!-- Head (main circle) -->
      <circle cx="50" cy="52" r="30" class="fill-orange-200 dark:fill-orange-300" />

      <!-- Muzzle -->
      <ellipse cx="50" cy="64" rx="18" ry="12" class="fill-orange-100 dark:fill-orange-200" />

      <!-- Nostrils -->
      <ellipse cx="43" cy="65" rx="3" ry="2.5" class="fill-orange-400 dark:fill-orange-500" />
      <ellipse cx="57" cy="65" rx="3" ry="2.5" class="fill-orange-400 dark:fill-orange-500" />

      <!-- Nose ring -->
      <path
        d="M44 69 Q50 76 56 69"
        fill="none"
        class="stroke-amber-500 dark:stroke-amber-400"
        stroke-width="2"
        stroke-linecap="round"
      />

      <!-- Eyes - idle/talking -->
      <g v-if="state === 'idle' || state === 'talking'">
        <circle cx="38" cy="48" r="5" class="fill-gray-800 dark:fill-gray-900" />
        <circle cx="62" cy="48" r="5" class="fill-gray-800 dark:fill-gray-900" />
        <circle cx="40" cy="46" r="1.8" class="fill-white" />
        <circle cx="64" cy="46" r="1.8" class="fill-white" />
      </g>

      <!-- Eyes - happy (curved/squinting) -->
      <g v-if="state === 'happy'">
        <path d="M33 48 Q38 43 43 48" fill="none" class="stroke-gray-800 dark:stroke-gray-900" stroke-width="2.5" stroke-linecap="round" />
        <path d="M57 48 Q62 43 67 48" fill="none" class="stroke-gray-800 dark:stroke-gray-900" stroke-width="2.5" stroke-linecap="round" />
      </g>

      <!-- Eyes - thinking (looking up-right) -->
      <g v-if="state === 'thinking'">
        <circle cx="38" cy="48" r="5" class="fill-gray-800 dark:fill-gray-900" />
        <circle cx="62" cy="48" r="5" class="fill-gray-800 dark:fill-gray-900" />
        <circle cx="40" cy="45" r="1.8" class="fill-white" />
        <circle cx="64" cy="45" r="1.8" class="fill-white" />
      </g>

      <!-- Eyebrows -->
      <path v-if="state === 'thinking'" d="M33 41 Q38 38 43 41" fill="none" class="stroke-orange-500 dark:stroke-orange-400" stroke-width="1.5" stroke-linecap="round" />
      <path v-if="state === 'thinking'" d="M57 41 Q62 38 67 41" fill="none" class="stroke-orange-500 dark:stroke-orange-400" stroke-width="1.5" stroke-linecap="round" />

      <!-- Mouth - idle -->
      <path v-if="state === 'idle'" d="M44 58 Q50 61 56 58" fill="none" class="stroke-orange-500 dark:stroke-orange-400" stroke-width="1.5" stroke-linecap="round" />

      <!-- Mouth - talking (open) -->
      <ellipse v-if="state === 'talking'" cx="50" cy="59" rx="5" ry="3" class="fill-orange-400 dark:fill-orange-500" />

      <!-- Mouth - happy (big smile) -->
      <path v-if="state === 'happy'" d="M42 57 Q50 64 58 57" fill="none" class="stroke-orange-500 dark:stroke-orange-400" stroke-width="2" stroke-linecap="round" />

      <!-- Mouth - thinking (small pout) -->
      <circle v-if="state === 'thinking'" cx="50" cy="59" r="2" class="fill-orange-400 dark:fill-orange-500" />

      <!-- Cheek blush -->
      <circle cx="30" cy="56" r="4" class="fill-pink-200/50 dark:fill-pink-300/40" />
      <circle cx="70" cy="56" r="4" class="fill-pink-200/50 dark:fill-pink-300/40" />

      <!-- Thinking dots -->
      <g v-if="state === 'thinking'" class="thinking-dots">
        <circle cx="78" cy="34" r="2" class="fill-gray-400 dark:fill-gray-500" />
        <circle cx="84" cy="26" r="2.5" class="fill-gray-400 dark:fill-gray-500" />
        <circle cx="90" cy="18" r="3" class="fill-gray-400 dark:fill-gray-500" />
      </g>

      <!-- Happy sparkles -->
      <g v-if="state === 'happy'" class="happy-sparkles">
        <path d="M18 34 L20 30 L22 34 L18 34" class="fill-amber-400" />
        <path d="M80 30 L82 26 L84 30 L80 30" class="fill-amber-400" />
      </g>
    </svg>
  </div>
</template>
